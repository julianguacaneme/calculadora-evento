<?php
// index.php - API de preventa. Uso: api/?accion=<nombre>, JSON de entrada y de salida.
// Roles: "admin" (Panel de Preventa) y "puerta" (escáner en Taquilla), cada uno con su PIN
// enviado en la cabecera X-Pin. La acción "boleta" es pública (página del comprador).

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MAX_INTENTOS = 10;      // PIN incorrecto por IP...
const VENTANA_INTENTOS = 900; // ...en 15 minutos
const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin 0/O, 1/I/L

function responder($datos, $status = 200)
{
    http_response_code($status);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar($mensaje, $status = 400)
{
    responder(['error' => $mensaje], $status);
}

function entrada()
{
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

function texto($valor, $max = 200)
{
    return mb_substr(trim((string)($valor ?? '')), 0, $max);
}

function ip()
{
    // Cloudflare está delante del servidor.
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
}

function config()
{
    $ruta = __DIR__ . '/config.php';
    $config = is_file($ruta) ? require $ruta : [];
    if (empty($config['pin_admin']) || empty($config['pin_puerta'])) {
        fallar('La preventa no está configurada en el servidor (falta api/config.php).', 500);
    }
    return $config;
}

// Devuelve el rol del PIN recibido o corta con 401/429.
function autenticar(array $rolesPermitidos)
{
    $config = config();
    $pdo = db();
    $pdo->prepare('DELETE FROM intentos WHERE hora < ?')->execute([time() - VENTANA_INTENTOS]);

    $q = $pdo->prepare('SELECT COUNT(*) FROM intentos WHERE ip = ?');
    $q->execute([ip()]);
    if ($q->fetchColumn() >= MAX_INTENTOS) fallar('Demasiados intentos. Espera 15 minutos.', 429);

    $pin = (string)($_SERVER['HTTP_X_PIN'] ?? '');
    $rol = null;
    if ($pin !== '' && hash_equals((string)$config['pin_admin'], $pin)) $rol = 'admin';
    elseif ($pin !== '' && hash_equals((string)$config['pin_puerta'], $pin)) $rol = 'puerta';

    if (!$rol) {
        $pdo->prepare('INSERT INTO intentos (ip, hora) VALUES (?, ?)')->execute([ip(), time()]);
        fallar('PIN incorrecto.', 401);
    }
    // El admin también puede usar la puerta.
    if (!in_array($rol, $rolesPermitidos, true) && $rol !== 'admin') fallar('Este PIN no tiene acceso a esta función.', 403);
    return $rol;
}

function generarCodigo()
{
    $q = db()->prepare('SELECT 1 FROM boletas WHERE codigo = ?');
    do {
        $codigo = '';
        for ($i = 0; $i < 8; $i++) $codigo .= ALFABETO_CODIGO[random_int(0, strlen(ALFABETO_CODIGO) - 1)];
        $q->execute([$codigo]);
    } while ($q->fetchColumn());
    return $codigo;
}

function normalizarCodigo($codigo)
{
    return preg_replace('/[^0-9A-Z]/', '', strtoupper((string)$codigo));
}

function obtenerEvento($id)
{
    $q = db()->prepare('SELECT * FROM eventos WHERE id = ?');
    $q->execute([(int)$id]);
    $evento = $q->fetch();
    if (!$evento) fallar('Evento no encontrado.', 404);
    $evento['etapas'] = json_decode($evento['etapas'], true) ?: [];
    return $evento;
}

function personasVendidas($eventoId, $etapaId = null)
{
    $sql = "SELECT COALESCE(SUM(cantidad), 0) FROM boletas WHERE evento_id = ? AND estado = 'activa'";
    $params = [(int)$eventoId];
    if ($etapaId !== null) {
        $sql .= ' AND etapa_id = ?';
        $params[] = $etapaId;
    }
    $q = db()->prepare($sql);
    $q->execute($params);
    return (int)$q->fetchColumn();
}

// Campos de la boleta según quién la pide: la puerta no necesita teléfono, correo ni pagos.
function boletaPara($b, $rol)
{
    $base = [
        'id' => (int)$b['id'],
        'codigo' => $b['codigo'],
        'nombre' => $b['nombre'],
        'cedula' => $b['cedula'],
        'cantidad' => (int)$b['cantidad'],
        'etapa' => $b['etapa_nombre'],
        'beneficio' => $b['beneficio'],
        'estado' => $b['estado'],
        'ingresados' => (int)$b['ingresados'],
        'beneficioEntregado' => (bool)$b['beneficio_entregado'],
        'primerIngreso' => $b['primer_ingreso'],
    ];
    if ($rol !== 'admin') return $base;
    return $base + [
        'whatsapp' => $b['whatsapp'],
        'email' => $b['email'],
        'etapaId' => $b['etapa_id'],
        'precioUnit' => (int)$b['precio_unit'],
        'total' => (int)$b['total'],
        'medioPago' => $b['medio_pago'],
        'referencia' => $b['referencia'],
        'notas' => $b['notas'],
        'creado' => $b['creado'],
    ];
}

function limpiarEtapas($etapas)
{
    $limpias = [];
    foreach (is_array($etapas) ? $etapas : [] as $e) {
        $nombre = texto($e['nombre'] ?? '', 60);
        if ($nombre === '') continue;
        $hasta = texto($e['hasta'] ?? '', 10);
        $limpias[] = [
            'id' => preg_match('/^[a-z0-9]{1,20}$/', $e['id'] ?? '') ? $e['id'] : bin2hex(random_bytes(4)),
            'nombre' => $nombre,
            'precio' => max(0, (int)($e['precio'] ?? 0)),
            'cupo' => isset($e['cupo']) && $e['cupo'] !== '' && $e['cupo'] !== null ? max(0, (int)$e['cupo']) : null,
            'hasta' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta) ? $hasta : null,
            'beneficio' => texto($e['beneficio'] ?? '', 200),
        ];
    }
    return $limpias;
}

// --- ACCIONES ---

$accion = $_GET['accion'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    switch ($accion) {

        // Pública: lo que ve el comprador en su boleta (sin cédula, teléfono ni pagos).
        case 'boleta':
            $q = db()->prepare('SELECT b.*, e.nombre AS evento, e.fecha, e.lugar FROM boletas b JOIN eventos e ON e.id = b.evento_id WHERE b.codigo = ?');
            $q->execute([normalizarCodigo($_GET['c'] ?? '')]);
            $b = $q->fetch();
            if (!$b) fallar('Boleta no encontrada.', 404);
            responder([
                'codigo' => $b['codigo'],
                'nombre' => $b['nombre'],
                'cantidad' => (int)$b['cantidad'],
                'etapa' => $b['etapa_nombre'],
                'beneficio' => $b['beneficio'],
                'estado' => $b['estado'],
                'ingresados' => (int)$b['ingresados'],
                'evento' => ['nombre' => $b['evento'], 'fecha' => $b['fecha'], 'lugar' => $b['lugar']],
            ]);

        case 'login':
            responder(['rol' => autenticar(['admin', 'puerta'])]);

        case 'eventos':
            autenticar(['admin', 'puerta']);
            $eventos = db()->query('SELECT * FROM eventos ORDER BY fecha DESC, id DESC')->fetchAll();
            foreach ($eventos as &$e) {
                $e['id'] = (int)$e['id'];
                $e['cupo'] = $e['cupo'] === null ? null : (int)$e['cupo'];
                $e['etapas'] = json_decode($e['etapas'], true) ?: [];
                foreach ($e['etapas'] as &$etapa) $etapa['vendidas'] = personasVendidas($e['id'], $etapa['id']);
                unset($etapa);
                $e['vendidas'] = personasVendidas($e['id']);
            }
            unset($e);
            responder(['eventos' => $eventos]);

        case 'guardarEvento':
            if ($metodo !== 'POST') fallar('Método no permitido.', 405);
            autenticar(['admin']);
            $d = entrada();
            $nombre = texto($d['nombre'] ?? '', 120);
            if ($nombre === '') fallar('El evento necesita un nombre.');
            $fecha = texto($d['fecha'] ?? '', 10);
            $campos = [
                $nombre,
                preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) ? $fecha : null,
                texto($d['lugar'] ?? '', 120),
                isset($d['cupo']) && $d['cupo'] !== '' && $d['cupo'] !== null ? max(0, (int)$d['cupo']) : null,
                json_encode(limpiarEtapas($d['etapas'] ?? []), JSON_UNESCAPED_UNICODE),
            ];
            if (!empty($d['id'])) {
                obtenerEvento($d['id']);
                $campos[] = (int)$d['id'];
                db()->prepare('UPDATE eventos SET nombre = ?, fecha = ?, lugar = ?, cupo = ?, etapas = ? WHERE id = ?')->execute($campos);
                responder(['id' => (int)$d['id']]);
            }
            $campos[] = date('c');
            db()->prepare('INSERT INTO eventos (nombre, fecha, lugar, cupo, etapas, creado) VALUES (?, ?, ?, ?, ?, ?)')->execute($campos);
            responder(['id' => (int)db()->lastInsertId()]);

        case 'boletas':
            $rol = autenticar(['admin', 'puerta']);
            $q = db()->prepare('SELECT * FROM boletas WHERE evento_id = ? ORDER BY id DESC');
            $q->execute([(int)($_GET['evento'] ?? 0)]);
            responder([
                'boletas' => array_map(function ($b) use ($rol) { return boletaPara($b, $rol); }, $q->fetchAll()),
                'actualizado' => date('c'),
            ]);

        case 'vender':
            if ($metodo !== 'POST') fallar('Método no permitido.', 405);
            autenticar(['admin']);
            $d = entrada();
            $evento = obtenerEvento($d['eventoId'] ?? 0);

            $nombre = texto($d['nombre'] ?? '', 120);
            $cantidad = (int)($d['cantidad'] ?? 0);
            if ($nombre === '') fallar('Falta el nombre del comprador.');
            if ($cantidad < 1 || $cantidad > 50) fallar('La cantidad debe estar entre 1 y 50.');
            if (empty($d['aceptaDatos'])) fallar('Falta la autorización de tratamiento de datos.');

            $etapa = null;
            foreach ($evento['etapas'] as $e) if ($e['id'] === ($d['etapaId'] ?? '')) $etapa = $e;
            if (!$etapa) fallar('Selecciona una etapa de venta válida.');

            $pdo = db();
            $pdo->beginTransaction();
            if ($evento['cupo'] !== null && personasVendidas($evento['id']) + $cantidad > (int)$evento['cupo']) {
                $pdo->rollBack();
                fallar('No hay cupo suficiente en el evento.');
            }
            if ($etapa['cupo'] !== null && personasVendidas($evento['id'], $etapa['id']) + $cantidad > $etapa['cupo']) {
                $pdo->rollBack();
                fallar("No hay cupo suficiente en la etapa \"{$etapa['nombre']}\".");
            }

            // El precio puede ajustarse (descuento, cortesía); si no llega, se usa el de la etapa.
            $precio = isset($d['precioUnit']) && $d['precioUnit'] !== '' ? max(0, (int)$d['precioUnit']) : $etapa['precio'];
            $codigo = generarCodigo();
            $pdo->prepare('INSERT INTO boletas (codigo, evento_id, etapa_id, etapa_nombre, nombre, cedula, whatsapp, email, cantidad, precio_unit, total, medio_pago, referencia, beneficio, notas, acepta_datos, creado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)')->execute([
                $codigo, $evento['id'], $etapa['id'], $etapa['nombre'], $nombre,
                texto($d['cedula'] ?? '', 20), preg_replace('/[^0-9+]/', '', $d['whatsapp'] ?? ''), texto($d['email'] ?? '', 120),
                $cantidad, $precio, $precio * $cantidad,
                texto($d['medioPago'] ?? '', 30), texto($d['referencia'] ?? '', 80), $etapa['beneficio'],
                texto($d['notas'] ?? '', 300), date('c'),
            ]);
            $id = (int)$pdo->lastInsertId();
            $pdo->commit();

            $q = $pdo->prepare('SELECT * FROM boletas WHERE id = ?');
            $q->execute([$id]);
            responder(['boleta' => boletaPara($q->fetch(), 'admin')]);

        case 'editarBoleta':
            if ($metodo !== 'POST') fallar('Método no permitido.', 405);
            autenticar(['admin']);
            $d = entrada();
            $q = db()->prepare('SELECT * FROM boletas WHERE id = ?');
            $q->execute([(int)($d['id'] ?? 0)]);
            $b = $q->fetch();
            if (!$b) fallar('Boleta no encontrada.', 404);

            $estado = in_array($d['estado'] ?? '', ['activa', 'anulada'], true) ? $d['estado'] : $b['estado'];
            if ($estado === 'activa' && $b['estado'] === 'anulada') {
                $evento = obtenerEvento($b['evento_id']);
                if ($evento['cupo'] !== null && personasVendidas($evento['id']) + (int)$b['cantidad'] > (int)$evento['cupo']) {
                    fallar('No hay cupo para reactivar esta boleta.');
                }
            }
            $nombre = array_key_exists('nombre', $d) ? texto($d['nombre'], 120) : $b['nombre'];
            if ($nombre === '') fallar('Falta el nombre del comprador.');
            db()->prepare('UPDATE boletas SET nombre = ?, cedula = ?, whatsapp = ?, email = ?, referencia = ?, notas = ?, estado = ? WHERE id = ?')->execute([
                $nombre,
                array_key_exists('cedula', $d) ? texto($d['cedula'], 20) : $b['cedula'],
                array_key_exists('whatsapp', $d) ? preg_replace('/[^0-9+]/', '', $d['whatsapp']) : $b['whatsapp'],
                array_key_exists('email', $d) ? texto($d['email'], 120) : $b['email'],
                array_key_exists('referencia', $d) ? texto($d['referencia'], 80) : $b['referencia'],
                array_key_exists('notas', $d) ? texto($d['notas'], 300) : $b['notas'],
                $estado,
                $b['id'],
            ]);
            $q->execute([$b['id']]);
            responder(['boleta' => boletaPara($q->fetch(), 'admin')]);

        // Recibe los ingresos registrados en la puerta (en lote, para sincronizar sin conexión).
        // Una cantidad negativa corrige un ingreso marcado por error.
        case 'ingresos':
            if ($metodo !== 'POST') fallar('Método no permitido.', 405);
            autenticar(['puerta']);
            $pdo = db();
            $buscar = $pdo->prepare('SELECT * FROM boletas WHERE codigo = ?');
            $existe = $pdo->prepare('SELECT 1 FROM ingresos WHERE id = ?');
            $resultados = [];

            foreach (array_slice(entrada()['ingresos'] ?? [], 0, 500) as $ing) {
                $id = texto($ing['id'] ?? '', 40);
                if ($id === '') continue;
                $existe->execute([$id]);
                if ($existe->fetchColumn()) {
                    $resultados[] = ['id' => $id, 'ok' => true, 'repetido' => true];
                    continue;
                }
                $buscar->execute([normalizarCodigo($ing['codigo'] ?? '')]);
                $b = $buscar->fetch();
                if (!$b) {
                    $resultados[] = ['id' => $id, 'ok' => false, 'error' => 'Boleta no encontrada'];
                    continue;
                }

                // Nunca menos de 0 ni más personas que las compradas.
                $nuevos = max(0, min((int)$b['cantidad'], (int)$b['ingresados'] + (int)($ing['cantidad'] ?? 0)));
                $hora = texto($ing['hora'] ?? '', 40) ?: date('c');
                $beneficio = isset($ing['beneficioEntregado']) ? (int)(bool)$ing['beneficioEntregado'] : (int)$b['beneficio_entregado'];

                $pdo->beginTransaction();
                $pdo->prepare('INSERT INTO ingresos (id, boleta_id, cantidad, beneficio, hora, recibido) VALUES (?, ?, ?, ?, ?, ?)')
                    ->execute([$id, $b['id'], $nuevos - (int)$b['ingresados'], $beneficio, $hora, date('c')]);
                $pdo->prepare('UPDATE boletas SET ingresados = ?, beneficio_entregado = ?, primer_ingreso = COALESCE(primer_ingreso, ?) WHERE id = ?')
                    ->execute([$nuevos, $beneficio, $nuevos > 0 ? $hora : null, $b['id']]);
                $pdo->commit();
                $resultados[] = ['id' => $id, 'ok' => true, 'ingresados' => $nuevos];
            }
            responder(['resultados' => $resultados]);

        default:
            fallar('Acción desconocida.', 404);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[preventa] ' . $e->getMessage());
    fallar('Error interno del servidor.', 500);
}
