// escaner.js - Validación de boletas de preventa en la puerta (QR o búsqueda manual).
// Funciona sin señal: guarda la lista de boletas en el celular, valida contra ella y
// envía los ingresos al servidor cuando vuelve la conexión.

(() => {
  const api = window.preventaAPI;
  const PUERTA_KEY = 'mambo_preventa_puerta_v1';
  const SYNC_MS = 30000;

  let lector = null;
  let camaraActiva = false;
  let ultimoCodigo = { codigo: null, hora: 0 };
  let sincronizando = false;

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('esc-login').addEventListener('submit', entrar);
    document.getElementById('esc-salir').addEventListener('click', salir);
    document.getElementById('esc-evento').addEventListener('change', cambiarEvento);
    document.getElementById('esc-actualizar').addEventListener('click', () => sincronizar(true));
    document.getElementById('esc-camara').addEventListener('click', alternarCamara);
    document.getElementById('esc-buscar').addEventListener('input', buscar);

    // La cámara se apaga al salir de la pestaña.
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.target !== 'section-escanear') detenerCamara();
    }));
    window.addEventListener('online', () => sincronizar());
    setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, SYNC_MS);

    mostrarPantalla();
    if (api.getPin()) sincronizar(true);
  });

  // --- ESTADO LOCAL ---
  function leer() {
    const vacio = { eventos: [], eventoId: null, boletas: [], actualizado: null, cola: [] };
    try {
      return { ...vacio, ...JSON.parse(localStorage.getItem(PUERTA_KEY) || '{}') };
    } catch (e) {
      return vacio;
    }
  }

  function guardar(estado) {
    try { localStorage.setItem(PUERTA_KEY, JSON.stringify(estado)); } catch (e) { console.error('No se pudo guardar el estado de la puerta:', e); }
  }

  // Boleta como la ve la puerta: lo del servidor más los ingresos que aún no se han enviado.
  function boletaLocal(estado, codigo) {
    const b = estado.boletas.find(x => x.codigo === codigo);
    if (!b) return null;
    const vista = { ...b };
    estado.cola.filter(i => i.codigo === codigo).forEach(i => {
      vista.ingresados = Math.max(0, Math.min(vista.cantidad, vista.ingresados + i.cantidad));
      vista.beneficioEntregado = i.beneficioEntregado;
      if (vista.ingresados > 0 && !vista.primerIngreso) vista.primerIngreso = i.hora;
    });
    return vista;
  }

  // --- ACCESO ---
  function mostrarPantalla() {
    const logueado = !!api.getPin();
    document.getElementById('esc-login').style.display = logueado ? 'none' : 'block';
    document.getElementById('esc-app').style.display = logueado ? 'block' : 'none';
    if (logueado) render();
  }

  async function entrar(e) {
    e.preventDefault();
    const feedback = document.getElementById('esc-login-feedback');
    feedback.style.display = 'none';
    try {
      await api.login(document.getElementById('esc-pin').value.trim());
    } catch (err) {
      feedback.textContent = err.message;
      feedback.style.display = 'block';
      return;
    }
    document.getElementById('esc-pin').value = '';
    mostrarPantalla();
    sincronizar(true);
  }

  function salir() {
    const { cola } = leer();
    if (cola.length && !confirm(`Hay ${cola.length} ingreso(s) sin enviar al servidor. Si cierras sesión se perderán. ¿Continuar?`)) return;
    if (!cola.length && !confirm('¿Cerrar la sesión de la puerta en este celular?')) return;
    detenerCamara();
    api.setPin('');
    try { localStorage.removeItem(PUERTA_KEY); } catch (e) { /* nada que borrar */ }
    mostrarPantalla();
  }

  // --- SINCRONIZACIÓN ---
  // Primero envía los ingresos pendientes y luego descarga la lista actualizada.
  async function sincronizar(manual = false) {
    if (sincronizando || !api.getPin()) return;
    sincronizando = true;
    let estado = leer();
    try {
      if (estado.cola.length) {
        const { resultados } = await api.llamar('ingresos', { body: { ingresos: estado.cola } });
        const procesados = new Set(resultados.map(r => r.id));
        estado = leer();
        estado.cola = estado.cola.filter(i => !procesados.has(i.id));
        guardar(estado);
      }

      const { eventos } = await api.llamar('eventos');
      const eventoId = eventos.some(ev => ev.id === estado.eventoId) ? estado.eventoId : eventoPorDefecto(eventos);
      const descarga = eventoId ? await api.llamar('boletas', { params: { evento: eventoId } }) : { boletas: [], actualizado: null };

      // Releer justo antes de guardar: la cola pudo crecer mientras se descargaba.
      estado = leer();
      estado.eventos = eventos.map(ev => ({ id: ev.id, nombre: ev.nombre, fecha: ev.fecha }));
      // Si cambiaron de evento mientras se descargaba, no mezclar listas.
      if (estado.eventoId === eventoId || !eventos.some(ev => ev.id === estado.eventoId)) {
        estado.eventoId = eventoId;
        estado.boletas = descarga.boletas;
        estado.actualizado = descarga.actualizado;
      }
      guardar(estado);
    } catch (err) {
      if (err.status === 401) {
        api.setPin('');
        mostrarPantalla();
        document.getElementById('esc-login-feedback').textContent = 'El PIN cambió o no es válido. Ingrésalo de nuevo.';
        document.getElementById('esc-login-feedback').style.display = 'block';
      } else if (manual) {
        alert(err.sinConexion ? 'Sin conexión. Se sigue validando con la lista guardada en el celular.' : err.message);
      }
    } finally {
      sincronizando = false;
      render();
    }
  }

  // El evento de hoy, o el próximo, o el más reciente.
  function eventoPorDefecto(eventos) {
    if (!eventos.length) return null;
    const hoy = new Date().toLocaleDateString('en-CA');
    const proximos = eventos.filter(ev => ev.fecha && ev.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return (proximos[0] || eventos[0]).id;
  }

  function cambiarEvento() {
    const estado = leer();
    if (estado.cola.length) {
      alert('Hay ingresos sin enviar. Conéctate a internet y pulsa "Actualizar" antes de cambiar de evento.');
      document.getElementById('esc-evento').value = estado.eventoId;
      return;
    }
    estado.eventoId = Number(document.getElementById('esc-evento').value);
    estado.boletas = [];
    estado.actualizado = null;
    guardar(estado);
    cerrarResultado();
    sincronizar(true);
  }

  // --- RENDER ---
  function render() {
    const estado = leer();
    const select = document.getElementById('esc-evento');
    select.innerHTML = estado.eventos.map(ev => `<option value="${ev.id}">${escaparHTML(ev.nombre)}${ev.fecha ? ' · ' + ev.fecha : ''}</option>`).join('');
    if (estado.eventoId) select.value = estado.eventoId;

    const partes = [];
    partes.push(estado.actualizado
      ? `Lista de ${estado.boletas.length} boleta(s), actualizada ${new Date(estado.actualizado).toLocaleTimeString('es-CO', { timeStyle: 'short' })}`
      : 'Lista sin descargar: conéctate a internet y pulsa "Actualizar".');
    partes.push(navigator.onLine ? '🟢 En línea' : '🔴 Sin conexión');
    if (estado.cola.length) partes.push(`⏳ ${estado.cola.length} ingreso(s) por enviar`);
    document.getElementById('esc-estado').textContent = partes.join(' · ');

    const activas = estado.boletas.filter(b => b.estado === 'activa').map(b => boletaLocal(estado, b.codigo));
    const total = activas.reduce((s, b) => s + b.cantidad, 0);
    const adentro = activas.reduce((s, b) => s + b.ingresados, 0);
    document.getElementById('esc-progreso').textContent = total ? `Han ingresado ${adentro} de ${total} personas con preventa.` : '';
  }

  // --- CÁMARA ---
  async function alternarCamara() {
    if (camaraActiva) {
      await detenerCamara();
      return;
    }
    if (!window.Html5Qrcode) {
      alert('No se cargó el lector de QR. Recarga la página con internet.');
      return;
    }
    cerrarResultado();
    lector = lector || new Html5Qrcode('esc-lector');
    try {
      await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, alLeer);
      camaraActiva = true;
    } catch (err) {
      alert('No se pudo abrir la cámara. Revisa que la página tenga permiso de usar la cámara (requiere https).');
    }
    actualizarBotonCamara();
  }

  async function detenerCamara() {
    if (lector && camaraActiva) {
      try { await lector.stop(); } catch (e) { /* ya estaba detenida */ }
    }
    camaraActiva = false;
    actualizarBotonCamara();
  }

  function actualizarBotonCamara() {
    document.getElementById('esc-camara').textContent = camaraActiva ? 'Detener cámara' : 'Escanear QR';
  }

  function alLeer(texto) {
    const codigo = PreventaAPI.extraerCodigo(texto);
    // El lector entrega el mismo QR muchas veces por segundo.
    if (codigo === ultimoCodigo.codigo && Date.now() - ultimoCodigo.hora < 4000) return;
    ultimoCodigo = { codigo, hora: Date.now() };
    try { lector.pause(true); } catch (e) { /* sigue leyendo */ }
    validar(codigo);
  }

  // --- VALIDACIÓN ---
  async function validar(codigo) {
    let estado = leer();
    let b = boletaLocal(estado, codigo);
    // Puede ser una venta posterior a la última descarga: reintentar con la lista nueva.
    if (!b && navigator.onLine) {
      await sincronizar();
      estado = leer();
      b = boletaLocal(estado, codigo);
    }
    mostrarResultado(b, codigo);
  }

  function mostrarResultado(b, codigo) {
    const cont = document.getElementById('esc-resultado');
    cont.style.display = 'block';
    let clase, titulo, cuerpo = '', acciones = '';

    if (!b) {
      clase = 'esc-invalida';
      titulo = '✖ NO ENCONTRADA';
      cuerpo = `<p>El código <strong>${escaparHTML(PreventaAPI.formatoCodigo(codigo) || '—')}</strong> no está en la lista de este evento.</p>
        <p class="hint">Puede ser de otro evento o falsa. Si el comprador insiste, búscalo por nombre o cédula.</p>`;
      vibrar([300, 100, 300]);
    } else {
      const pendientes = b.cantidad - b.ingresados;
      cuerpo = `
        <p class="esc-nombre">${escaparHTML(b.nombre)}</p>
        <p>${b.cantidad} entrada(s) · ${escaparHTML(b.etapa || '')}${b.cedula ? ' · CC ' + escaparHTML(b.cedula) : ''}</p>
        ${b.beneficio ? `<p class="esc-beneficio">🎁 ${escaparHTML(b.beneficio)}${b.beneficioEntregado ? ' (ya entregado)' : ''}</p>` : ''}
      `;
      if (b.estado === 'anulada') {
        clase = 'esc-invalida';
        titulo = '✖ BOLETA ANULADA';
        vibrar([300, 100, 300]);
      } else if (pendientes <= 0) {
        clase = 'esc-usada';
        titulo = '⚠ YA INGRESÓ';
        cuerpo += `<p>Ingresó ${b.primerIngreso ? 'a las ' + new Date(b.primerIngreso).toLocaleTimeString('es-CO', { timeStyle: 'short' }) : ''}. No dejar entrar de nuevo.</p>`;
        acciones = `<button type="button" class="taq-btn-secundario btn-small" data-corregir>Corregir: restar 1 ingreso</button>`;
        vibrar([300, 100, 300]);
      } else {
        clase = 'esc-valida';
        titulo = b.ingresados > 0 ? `✔ VÁLIDA · faltan ${pendientes}` : '✔ VÁLIDA';
        const botones = Array.from({ length: pendientes }, (_, i) => i + 1)
          .map(n => `<button type="button" class="esc-cant${n === pendientes ? ' active' : ''}" data-cant="${n}">${n}</button>`).join('');
        acciones = `
          <p>¿Cuántas personas entran ahora?</p>
          <div class="esc-cantidades">${botones}</div>
          ${b.beneficio && !b.beneficioEntregado ? '<label class="esc-check"><input type="checkbox" id="esc-beneficio" checked> Beneficio entregado</label>' : ''}
          <button type="button" class="esc-confirmar" data-confirmar>Confirmar ingreso</button>
          ${b.ingresados > 0 ? '<button type="button" class="taq-btn-secundario btn-small" data-corregir>Corregir: restar 1 ingreso</button>' : ''}
        `;
        vibrar(150);
      }
    }

    cont.className = `esc-resultado ${clase}`;
    cont.innerHTML = `<p class="esc-titulo">${titulo}</p>${cuerpo}${acciones}
      <button type="button" class="taq-btn-secundario" data-siguiente>${camaraActiva ? 'Siguiente' : 'Cerrar'}</button>`;

    let cantidad = b ? b.cantidad - b.ingresados : 0;
    cont.querySelectorAll('[data-cant]').forEach(btn => btn.addEventListener('click', () => {
      cantidad = Number(btn.dataset.cant);
      cont.querySelectorAll('[data-cant]').forEach(x => x.classList.toggle('active', x === btn));
    }));
    cont.querySelector('[data-confirmar]')?.addEventListener('click', () => {
      const check = document.getElementById('esc-beneficio');
      registrarIngreso(b, cantidad, check ? check.checked : b.beneficioEntregado);
    });
    cont.querySelector('[data-corregir]')?.addEventListener('click', () => {
      if (confirm(`¿Restar 1 ingreso a la boleta de ${b.nombre}?`)) registrarIngreso(b, -1, b.beneficioEntregado);
    });
    cont.querySelector('[data-siguiente]').addEventListener('click', cerrarResultado);
    cont.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function registrarIngreso(b, cantidad, beneficioEntregado) {
    const estado = leer();
    estado.cola.push({
      id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
      codigo: b.codigo,
      cantidad,
      beneficioEntregado: !!beneficioEntregado,
      hora: new Date().toISOString()
    });
    guardar(estado);

    const cont = document.getElementById('esc-resultado');
    cont.className = 'esc-resultado esc-valida';
    cont.innerHTML = `<p class="esc-titulo">${cantidad > 0 ? `✔ ¡Bienvenidos! Ingresan ${cantidad}` : 'Ingreso corregido'}</p>
      <p class="esc-nombre">${escaparHTML(b.nombre)}</p>
      <button type="button" class="taq-btn-secundario" data-siguiente>${camaraActiva ? 'Siguiente' : 'Cerrar'}</button>`;
    cont.querySelector('[data-siguiente]').addEventListener('click', cerrarResultado);

    document.getElementById('esc-buscar').value = '';
    document.getElementById('esc-busqueda').innerHTML = '';
    render();
    sincronizar();
  }

  function cerrarResultado() {
    const cont = document.getElementById('esc-resultado');
    cont.style.display = 'none';
    cont.innerHTML = '';
    ultimoCodigo = { codigo: null, hora: 0 };
    if (lector && camaraActiva) {
      try { lector.resume(); } catch (e) { /* no estaba en pausa */ }
    }
  }

  // --- BÚSQUEDA MANUAL ---
  function buscar() {
    const texto = document.getElementById('esc-buscar').value.trim().toLowerCase();
    const cont = document.getElementById('esc-busqueda');
    if (texto.length < 3) {
      cont.innerHTML = '';
      return;
    }
    const estado = leer();
    const codigo = PreventaAPI.extraerCodigo(texto);
    const encontrados = estado.boletas.filter(b =>
      b.nombre.toLowerCase().includes(texto) ||
      (b.cedula || '').includes(texto) ||
      (codigo.length >= 4 && b.codigo.includes(codigo))
    ).slice(0, 10);

    if (!encontrados.length) {
      cont.innerHTML = '<p class="empty-state">Sin resultados.</p>';
      return;
    }
    cont.innerHTML = '';
    encontrados.forEach(original => {
      const b = boletaLocal(estado, original.codigo);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'esc-item';
      btn.innerHTML = `<strong>${escaparHTML(b.nombre)}</strong>
        <span>${b.cedula ? 'CC ' + escaparHTML(b.cedula) + ' · ' : ''}${b.ingresados}/${b.cantidad} ingresaron${b.estado === 'anulada' ? ' · ANULADA' : ''}</span>`;
      btn.addEventListener('click', () => mostrarResultado(b, b.codigo));
      cont.appendChild(btn);
    });
  }

  function vibrar(patron) {
    if (navigator.vibrate) navigator.vibrate(patron);
  }
})();
