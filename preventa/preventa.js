// preventa.js - Mambo Candela Panel de Preventa (venta de boletas con QR, datos en el servidor)

const api = window.preventaAPI;
const EVENTO_KEY = 'mambo_preventa_evento_v1';

let eventos = [];
let boletas = [];
let boletaAbierta = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  document.getElementById('formLogin').addEventListener('submit', entrar);
  document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
  document.getElementById('selectEvento').addEventListener('change', cambiarEvento);

  document.getElementById('selectEtapa').addEventListener('change', aplicarEtapa);
  document.getElementById('ventaCantidad').addEventListener('input', actualizarTotal);
  document.getElementById('ventaPrecio').addEventListener('input', actualizarTotal);
  document.getElementById('formVenta').addEventListener('submit', vender);

  document.getElementById('buscarBoleta').addEventListener('input', renderBoletas);
  document.getElementById('btnExportarCSV').addEventListener('click', exportarCSV);

  document.getElementById('formEvento').addEventListener('submit', guardarEvento);
  document.getElementById('btnAgregarEtapa').addEventListener('click', () => agregarFilaEtapa());
  document.getElementById('btnCancelarEvento').addEventListener('click', limpiarFormEvento);

  document.getElementById('btnEnviarWA').addEventListener('click', () => enviarWhatsApp(boletaAbierta));
  document.getElementById('btnCopiarLink').addEventListener('click', copiarLink);
  document.getElementById('btnAnular').addEventListener('click', alternarAnulada);
  document.getElementById('btnCerrarDialogo').addEventListener('click', () => document.getElementById('dialogoBoleta').close());

  limpiarFormEvento();
  if (api.getPin()) iniciarSesion();
});

// --- ACCESO ---
async function entrar(e) {
  e.preventDefault();
  api.setPin(document.getElementById('pinLogin').value.trim());
  await iniciarSesion();
}

async function iniciarSesion() {
  const feedback = document.getElementById('loginFeedback');
  feedback.style.display = 'none';
  try {
    const { rol } = await api.login(api.getPin());
    if (rol !== 'admin') {
      api.setPin('');
      throw new Error('Ese PIN es el de la puerta. Usa el PIN de administrador.');
    }
  } catch (err) {
    feedback.textContent = err.message;
    feedback.style.display = 'block';
    return;
  }
  document.getElementById('pinLogin').value = '';
  document.getElementById('pantallaLogin').style.display = 'none';
  document.getElementById('pantallaApp').style.display = 'block';
  await cargarEventos();
}

function cerrarSesion() {
  api.setPin('');
  location.reload();
}

// --- NAVEGACIÓN ---
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.view-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => irA(btn.getAttribute('data-target')));
  });

  function irA(target) {
    navBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-target') === target));
    sections.forEach(s => s.classList.toggle('active', s.id === target));
  }
  window.irA = irA;
}

// --- EVENTOS ---
async function cargarEventos() {
  try {
    ({ eventos } = await api.llamar('eventos'));
  } catch (err) {
    mostrarFeedback(err.message, true);
    return;
  }

  const select = document.getElementById('selectEvento');
  const guardado = leerLocal(EVENTO_KEY);
  select.innerHTML = eventos.map(ev =>
    `<option value="${ev.id}">${escaparHTML(ev.nombre)}${ev.fecha ? ' · ' + formatoFecha(ev.fecha) : ''}</option>`
  ).join('');
  if (eventos.some(ev => String(ev.id) === guardado)) select.value = guardado;

  document.querySelector('.pv-evento-selector').style.display = eventos.length ? 'block' : 'none';
  renderEventos();
  if (!eventos.length) {
    window.irA('section-eventos');
    mostrarFeedback('Crea tu primer evento para empezar a vender.');
    return;
  }
  renderEtapasVenta();
  await cargarBoletas();
}

function eventoActual() {
  const id = Number(document.getElementById('selectEvento').value);
  return eventos.find(ev => ev.id === id) || null;
}

async function cambiarEvento() {
  guardarLocal(EVENTO_KEY, document.getElementById('selectEvento').value);
  renderEtapasVenta();
  await cargarBoletas();
}

function renderEventos() {
  const lista = document.getElementById('eventosLista');
  if (!eventos.length) {
    lista.innerHTML = '<div class="empty-state">No hay eventos todavía.</div>';
    return;
  }
  lista.innerHTML = '';
  eventos.forEach(ev => {
    const div = document.createElement('div');
    div.className = 'pv-evento-card';
    div.innerHTML = `
      <div>
        <strong>${escaparHTML(ev.nombre)}</strong>
        <span class="hint">${ev.fecha ? formatoFecha(ev.fecha) : 'Sin fecha'}${ev.lugar ? ' · ' + escaparHTML(ev.lugar) : ''}</span>
        <span class="hint">${ev.vendidas} vendidas${ev.cupo !== null ? ` de ${ev.cupo}` : ''} · ${ev.etapas.length} etapa(s)</span>
      </div>
      <button class="nav-btn btn-small">Editar</button>
    `;
    div.querySelector('button').addEventListener('click', () => editarEvento(ev));
    lista.appendChild(div);
  });
}

function editarEvento(ev) {
  document.getElementById('tituloFormEvento').textContent = 'Editar evento';
  document.getElementById('eventoId').value = ev.id;
  document.getElementById('eventoNombre').value = ev.nombre;
  document.getElementById('eventoFecha').value = ev.fecha || '';
  document.getElementById('eventoLugar').value = ev.lugar || '';
  document.getElementById('eventoCupo').value = ev.cupo ?? '';
  document.getElementById('etapasLista').innerHTML = '';
  ev.etapas.forEach(agregarFilaEtapa);
  document.getElementById('btnCancelarEvento').style.display = 'block';
  document.getElementById('formEvento').scrollIntoView({ behavior: 'smooth' });
}

function limpiarFormEvento() {
  document.getElementById('formEvento').reset();
  document.getElementById('eventoId').value = '';
  document.getElementById('tituloFormEvento').textContent = 'Nuevo evento';
  document.getElementById('btnCancelarEvento').style.display = 'none';
  document.getElementById('etapasLista').innerHTML = '';
  // Plantilla de etapas para un evento típico; se puede editar todo.
  agregarFilaEtapa({ nombre: 'Preventa', precio: 20000, beneficio: '' });
  agregarFilaEtapa({ nombre: 'Taquilla', precio: 25000, beneficio: '' });
}

function agregarFilaEtapa(etapa = {}) {
  const fila = document.createElement('div');
  fila.className = 'pv-etapa-fila';
  if (etapa.id) fila.dataset.id = etapa.id;
  fila.innerHTML = `
    <div class="pv-etapa-campos">
      <div><label>Nombre</label><input type="text" class="et-nombre" placeholder="Early bird" required></div>
      <div><label>Precio</label><input type="number" class="et-precio" inputmode="numeric" min="0" step="1000" required></div>
      <div><label>Cupo</label><input type="number" class="et-cupo" inputmode="numeric" min="0" placeholder="Sin límite"></div>
      <div><label>Vende hasta</label><input type="date" class="et-hasta"></div>
      <div class="pv-etapa-beneficio"><label>Beneficio</label><input type="text" class="et-beneficio" placeholder="Ej: coctel de bienvenida"></div>
    </div>
    <button type="button" class="btn-delete btn-small">Quitar</button>
  `;
  fila.querySelector('.et-nombre').value = etapa.nombre || '';
  fila.querySelector('.et-precio').value = etapa.precio ?? '';
  fila.querySelector('.et-cupo').value = etapa.cupo ?? '';
  fila.querySelector('.et-hasta').value = etapa.hasta || '';
  fila.querySelector('.et-beneficio').value = etapa.beneficio || '';
  fila.querySelector('button').addEventListener('click', () => {
    if (etapa.vendidas) {
      alert(`Esta etapa ya tiene ${etapa.vendidas} entrada(s) vendidas; no se puede quitar.`);
      return;
    }
    fila.remove();
  });
  document.getElementById('etapasLista').appendChild(fila);
}

async function guardarEvento(e) {
  e.preventDefault();
  const etapas = [...document.querySelectorAll('.pv-etapa-fila')].map(fila => ({
    id: fila.dataset.id,
    nombre: fila.querySelector('.et-nombre').value,
    precio: fila.querySelector('.et-precio').value,
    cupo: fila.querySelector('.et-cupo').value,
    hasta: fila.querySelector('.et-hasta').value,
    beneficio: fila.querySelector('.et-beneficio').value
  }));
  if (!etapas.length) {
    mostrarFeedback('Agrega al menos una etapa de venta.', true);
    return;
  }

  try {
    const { id } = await api.llamar('guardarEvento', {
      body: {
        id: document.getElementById('eventoId').value || null,
        nombre: document.getElementById('eventoNombre').value,
        fecha: document.getElementById('eventoFecha').value,
        lugar: document.getElementById('eventoLugar').value,
        cupo: document.getElementById('eventoCupo').value,
        etapas
      }
    });
    guardarLocal(EVENTO_KEY, String(id));
  } catch (err) {
    mostrarFeedback(err.message, true);
    return;
  }
  mostrarFeedback('Evento guardado.');
  limpiarFormEvento();
  await cargarEventos();
}

// --- VENDER ---
function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function etapaVigente(etapa) {
  return (!etapa.hasta || hoy() <= etapa.hasta) && (etapa.cupo === null || etapa.vendidas < etapa.cupo);
}

function renderEtapasVenta() {
  const ev = eventoActual();
  const select = document.getElementById('selectEtapa');
  if (!ev) {
    select.innerHTML = '';
    return;
  }
  select.innerHTML = ev.etapas.map(et => {
    const estado = etapaVigente(et) ? '' : (et.cupo !== null && et.vendidas >= et.cupo ? ' (agotada)' : ' (vencida)');
    const cupo = et.cupo !== null ? ` · ${et.vendidas}/${et.cupo}` : ` · ${et.vendidas} vendidas`;
    return `<option value="${et.id}">${escaparHTML(et.nombre)} — ${formatoMoneda(et.precio)}${cupo}${estado}</option>`;
  }).join('');
  const vigente = ev.etapas.find(etapaVigente);
  if (vigente) select.value = vigente.id;
  aplicarEtapa();
}

function etapaSeleccionada() {
  const ev = eventoActual();
  return ev ? ev.etapas.find(et => et.id === document.getElementById('selectEtapa').value) : null;
}

function aplicarEtapa() {
  const etapa = etapaSeleccionada();
  const info = document.getElementById('etapaInfo');
  if (!etapa) {
    info.textContent = '';
    return;
  }
  document.getElementById('ventaPrecio').value = etapa.precio;
  const partes = [];
  if (etapa.beneficio) partes.push(`🎁 ${etapa.beneficio}`);
  if (etapa.hasta) partes.push(`Hasta el ${formatoFecha(etapa.hasta)}`);
  if (!etapaVigente(etapa)) partes.push('⚠️ Esta etapa ya no está vigente');
  info.textContent = partes.join(' · ');
  info.classList.toggle('hint-warning', !etapaVigente(etapa));
  actualizarTotal();
}

function actualizarTotal() {
  const cantidad = Number(document.getElementById('ventaCantidad').value) || 0;
  const precio = Number(document.getElementById('ventaPrecio').value) || 0;
  document.getElementById('ventaTotal').textContent = formatoMoneda(cantidad * precio);
}

async function vender(e) {
  e.preventDefault();
  const ev = eventoActual();
  if (!ev) return;
  const btn = document.getElementById('btnVender');
  btn.disabled = true;

  try {
    const { boleta } = await api.llamar('vender', {
      body: {
        eventoId: ev.id,
        etapaId: document.getElementById('selectEtapa').value,
        cantidad: document.getElementById('ventaCantidad').value,
        precioUnit: document.getElementById('ventaPrecio').value,
        nombre: document.getElementById('ventaNombre').value,
        cedula: document.getElementById('ventaCedula').value,
        whatsapp: document.getElementById('ventaWhatsapp').value,
        email: document.getElementById('ventaEmail').value,
        medioPago: document.getElementById('ventaMedio').value,
        referencia: document.getElementById('ventaReferencia').value,
        notas: document.getElementById('ventaNotas').value,
        aceptaDatos: document.getElementById('ventaAcepta').checked
      }
    });
    ['ventaNombre', 'ventaCedula', 'ventaWhatsapp', 'ventaEmail', 'ventaReferencia', 'ventaNotas'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaAcepta').checked = false;
    await cargarEventos();
    mostrarBoleta(boleta, true);
  } catch (err) {
    mostrarFeedback(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// --- VENDIDAS ---
async function cargarBoletas() {
  const ev = eventoActual();
  if (!ev) return;
  try {
    ({ boletas } = await api.llamar('boletas', { params: { evento: ev.id } }));
  } catch (err) {
    mostrarFeedback(err.message, true);
    return;
  }
  renderBoletas();
}

function renderBoletas() {
  const ev = eventoActual();
  const activas = boletas.filter(b => b.estado === 'activa');
  const personas = activas.reduce((s, b) => s + b.cantidad, 0);
  const ingresados = activas.reduce((s, b) => s + b.ingresados, 0);

  document.getElementById('statsVentas').innerHTML = `
    <div class="pv-stat pv-stat-principal"><span>Recaudado</span><strong>${formatoMoneda(activas.reduce((s, b) => s + b.total, 0))}</strong></div>
    <div class="pv-stat"><span>Personas</span><strong>${personas}${ev && ev.cupo !== null ? ` / ${ev.cupo}` : ''}</strong></div>
    <div class="pv-stat"><span>Boletas</span><strong>${activas.length}</strong></div>
    <div class="pv-stat"><span>Ya ingresaron</span><strong>${ingresados}</strong></div>
  `;
  document.getElementById('statsEtapas').innerHTML = ev ? ev.etapas.map(et =>
    `<span class="pv-chip">${escaparHTML(et.nombre)}: ${et.vendidas}${et.cupo !== null ? '/' + et.cupo : ''}</span>`
  ).join('') : '';

  const filtro = document.getElementById('buscarBoleta').value.trim().toLowerCase();
  const filtroCodigo = PreventaAPI.extraerCodigo(filtro);
  const lista = boletas.filter(b => !filtro ||
    b.nombre.toLowerCase().includes(filtro) ||
    (b.cedula || '').includes(filtro) ||
    (b.whatsapp || '').includes(filtro.replace(/\D/g, '') || '—') ||
    (filtroCodigo.length >= 4 && b.codigo.includes(filtroCodigo)));

  const tbody = document.querySelector('#boletasTable tbody');
  tbody.innerHTML = '';
  document.getElementById('boletas-feedback').style.display = lista.length ? 'none' : 'block';
  document.getElementById('btnExportarCSV').disabled = boletas.length === 0;

  lista.forEach(b => {
    const tr = document.createElement('tr');
    if (b.estado === 'anulada') tr.className = 'pv-anulada';
    tr.innerHTML = `
      <td><code>${PreventaAPI.formatoCodigo(b.codigo)}</code></td>
      <td>${escaparHTML(b.nombre)}<span class="hint">${escaparHTML(b.etapa || '')} · ${escaparHTML(b.medioPago || '')}</span></td>
      <td>${b.cantidad}</td>
      <td>${formatoMoneda(b.total)}</td>
      <td>${etiquetaEstado(b)}</td>
      <td><button class="nav-btn btn-small">Ver</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => mostrarBoleta(b));
    tbody.appendChild(tr);
  });
}

function etiquetaEstado(b) {
  if (b.estado === 'anulada') return '<span class="pv-estado pv-estado-anulada">Anulada</span>';
  if (b.ingresados >= b.cantidad) return '<span class="pv-estado pv-estado-ok">Ingresó</span>';
  if (b.ingresados > 0) return `<span class="pv-estado pv-estado-parcial">${b.ingresados}/${b.cantidad}</span>`;
  return '<span class="pv-estado">Pendiente</span>';
}

// --- DETALLE DE BOLETA ---
function mostrarBoleta(b, nueva = false) {
  boletaAbierta = b;
  const ev = eventoActual();
  const cont = document.getElementById('dialogoContenido');
  cont.innerHTML = `
    ${nueva ? '<div class="feedback-message success">¡Venta registrada! Envía la boleta al comprador.</div>' : ''}
    <h2>${escaparHTML(b.nombre)}</h2>
    <div class="pv-qr" id="qrBoleta"></div>
    <p class="pv-codigo">${PreventaAPI.formatoCodigo(b.codigo)}</p>
    <dl class="pv-detalle">
      <dt>Evento</dt><dd>${escaparHTML(ev ? ev.nombre : '')}</dd>
      <dt>Entradas</dt><dd>${b.cantidad} · ${escaparHTML(b.etapa || '')}</dd>
      ${b.beneficio ? `<dt>Beneficio</dt><dd>${escaparHTML(b.beneficio)}</dd>` : ''}
      <dt>Total</dt><dd>${formatoMoneda(b.total)} · ${escaparHTML(b.medioPago || '')}${b.referencia ? ' · Ref. ' + escaparHTML(b.referencia) : ''}</dd>
      ${b.cedula ? `<dt>Cédula</dt><dd>${escaparHTML(b.cedula)}</dd>` : ''}
      ${b.whatsapp ? `<dt>WhatsApp</dt><dd>${escaparHTML(b.whatsapp)}</dd>` : ''}
      ${b.email ? `<dt>Correo</dt><dd>${escaparHTML(b.email)}</dd>` : ''}
      ${b.notas ? `<dt>Notas</dt><dd>${escaparHTML(b.notas)}</dd>` : ''}
      <dt>Estado</dt><dd>${etiquetaEstado(b)}${b.primerIngreso ? ' · desde ' + formatoHora(b.primerIngreso) : ''}</dd>
    </dl>
  `;
  new QRCode(document.getElementById('qrBoleta'), {
    text: api.urlBoleta(b.codigo), width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M
  });
  document.getElementById('btnEnviarWA').disabled = !b.whatsapp || b.estado === 'anulada';
  document.getElementById('btnAnular').textContent = b.estado === 'anulada' ? 'Reactivar boleta' : 'Anular boleta';
  document.getElementById('dialogoBoleta').showModal();
}

function numeroWhatsApp(numero) {
  let digitos = String(numero || '').replace(/\D/g, '');
  if (digitos.length === 10 && digitos.startsWith('3')) digitos = '57' + digitos; // celular colombiano
  return digitos;
}

function enviarWhatsApp(b) {
  if (!b || !b.whatsapp) return;
  const ev = eventoActual();
  const lineas = [
    `¡Hola, ${b.nombre.split(' ')[0]}! 🎉 Tu entrada para *${ev ? ev.nombre : 'el evento'}* está confirmada.`,
    '',
    `🎟️ ${b.cantidad} entrada(s) · ${b.etapa}`
  ];
  if (b.beneficio) lineas.push(`🎁 Beneficio: ${b.beneficio}`);
  if (ev && (ev.fecha || ev.lugar)) lineas.push(`📅 ${[ev.fecha ? formatoFecha(ev.fecha) : '', ev.lugar].filter(Boolean).join(' · ')}`);
  lineas.push('', 'Presenta el QR de este link en la entrada:', api.urlBoleta(b.codigo), '', `Código: ${PreventaAPI.formatoCodigo(b.codigo)}`);

  window.open(`https://wa.me/${numeroWhatsApp(b.whatsapp)}?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank');
}

async function copiarLink() {
  if (!boletaAbierta) return;
  const url = api.urlBoleta(boletaAbierta.codigo);
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById('btnCopiarLink').textContent = '¡Copiado!';
  } catch (e) {
    prompt('Copia el link de la boleta:', url);
  }
  setTimeout(() => { document.getElementById('btnCopiarLink').textContent = 'Copiar link'; }, 2000);
}

async function alternarAnulada() {
  const b = boletaAbierta;
  if (!b) return;
  const anular = b.estado !== 'anulada';
  if (anular && !confirm(`¿Anular la boleta de ${b.nombre}? El QR dejará de servir en la puerta y se libera el cupo.`)) return;

  try {
    const { boleta } = await api.llamar('editarBoleta', { body: { id: b.id, estado: anular ? 'anulada' : 'activa' } });
    await cargarEventos();
    mostrarBoleta(boleta);
  } catch (err) {
    alert(err.message);
  }
}

// --- EXPORTAR ---
function exportarCSV() {
  if (!boletas.length) return;
  const ev = eventoActual();
  const csvField = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const headers = ['Código', 'Fecha venta', 'Nombre', 'Cédula', 'WhatsApp', 'Correo', 'Etapa', 'Entradas', 'Precio unitario', 'Total', 'Medio de pago', 'Referencia', 'Beneficio', 'Estado', 'Ingresaron', 'Beneficio entregado', 'Notas'];
  const rows = boletas.map(b => [
    PreventaAPI.formatoCodigo(b.codigo),
    new Date(b.creado).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
    b.nombre, b.cedula, b.whatsapp, b.email, b.etapa, b.cantidad, b.precioUnit, b.total,
    b.medioPago, b.referencia, b.beneficio, b.estado, b.ingresados, b.beneficioEntregado ? 'Sí' : 'No', b.notas
  ].map(csvField).join(','));

  const csv = '﻿' + [headers.map(csvField).join(','), ...rows].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `preventa_${(ev ? ev.nombre : 'evento').replace(/[^\w-]+/g, '_')}_${hoy()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- HELPERS ---
function leerLocal(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function guardarLocal(key, valor) {
  try { localStorage.setItem(key, valor); } catch (e) { /* no es crítico */ }
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatoMoneda(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatoFecha(fecha) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatoHora(iso) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

let feedbackTimer;
function mostrarFeedback(mensaje, esError = false) {
  const el = document.getElementById('feedbackMessage');
  el.textContent = mensaje;
  el.className = esError ? 'feedback-message error' : 'feedback-message success';
  el.style.display = 'block';
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => el.style.display = 'none', 4000);
}
