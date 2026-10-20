<?php
// db.php - Base de datos SQLite de la preventa (se crea sola la primera vez).

date_default_timezone_set('America/Bogota');

// El prefijo ".ht" hace que Apache/LiteSpeed nieguen la descarga directa del archivo,
// además del .htaccess de la carpeta datos/.
define('DB_PATH', __DIR__ . '/datos/.htpreventa.sqlite');

function db()
{
    static $pdo = null;
    if ($pdo) return $pdo;

    if (!is_dir(dirname(DB_PATH))) mkdir(dirname(DB_PATH), 0750, true);

    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            fecha TEXT,
            lugar TEXT,
            cupo INTEGER,
            etapas TEXT NOT NULL DEFAULT '[]',
            creado TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS boletas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL UNIQUE,
            evento_id INTEGER NOT NULL REFERENCES eventos(id),
            etapa_id TEXT,
            etapa_nombre TEXT,
            nombre TEXT NOT NULL,
            cedula TEXT,
            whatsapp TEXT,
            email TEXT,
            cantidad INTEGER NOT NULL,
            precio_unit INTEGER NOT NULL,
            total INTEGER NOT NULL,
            medio_pago TEXT,
            referencia TEXT,
            beneficio TEXT,
            notas TEXT,
            acepta_datos INTEGER NOT NULL DEFAULT 0,
            estado TEXT NOT NULL DEFAULT 'activa',
            ingresados INTEGER NOT NULL DEFAULT 0,
            beneficio_entregado INTEGER NOT NULL DEFAULT 0,
            primer_ingreso TEXT,
            creado TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_boletas_evento ON boletas(evento_id);
        -- Cada ingreso trae un id generado en el celular de la puerta: reenviarlo (sincronización
        -- sin conexión) no lo cuenta dos veces.
        CREATE TABLE IF NOT EXISTS ingresos (
            id TEXT PRIMARY KEY,
            boleta_id INTEGER NOT NULL REFERENCES boletas(id),
            cantidad INTEGER NOT NULL,
            beneficio INTEGER NOT NULL DEFAULT 0,
            hora TEXT NOT NULL,
            recibido TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS intentos (
            ip TEXT NOT NULL,
            hora INTEGER NOT NULL
        );
    ");

    return $pdo;
}
