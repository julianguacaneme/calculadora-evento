// taquilla.js - Mambo Candela Panel de Taquilla (registro de entradas en la puerta)

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initRegistro();
  renderResumen();

  document.getElementById('btnExportarCSV').addEventListener('click', exportarCSV);
  document.getElementById('btnNuevoEvento').addEventListener('click', iniciarNuevoEvento);

  // Si el panel está abierto en otra pestaña, mantenerlo al día.
  window.addEventListener('storage', (e) => {
    if (e.key === window.storageManager.taquillaKey) {
      cargarPrecio();
      renderResumen();
    }
  });
});

let cantidadSeleccionada = null;

// --- NAVEGACIÓN ---
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.view-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
  });
}

// --- REGISTRO ---
function initRegistro() {
  const teclado = document.getElementById('tecladoCantidad');
  for (let n = 1; n <= 10; n++) {
    const btn = document.createElement('button');
    btn.textContent = n;
    btn.dataset.cantidad = n;
    btn.addEventListener('click', () => seleccionarCantidad(n));
    teclado.appendChild(btn);
  }

  cargarPrecio();
  document.getElementById('precioCover').addEventListener('input', (e) => {
    const valor = e.target.value;
    window.storageManager.setPrecioCover(valor === '' ? null : Math.max(0, Math.round(Number(valor))));
    actualizarSeleccion();
  });

  document.getElementById('btnLimpiar').addEventListener('click', () => {
    cantidadSeleccionada = null;
    actualizarSeleccion();
  });

  document.querySelectorAll('.taq-medio').forEach(btn => {
    btn.addEventListener('click', () => registrar(btn.dataset.medio));
  });

  actualizarSeleccion();
}

function cargarPrecio() {
  const { precioCover } = window.storageManager.getTaquilla();
  document.getElementById('precioCover').value = precioCover ?? '';
  actualizarSeleccion();
}

function getPrecio() {
  return window.storageManager.getTaquilla().precioCover;
}

function seleccionarCantidad(n) {
  cantidadSeleccionada = n;
  actualizarSeleccion();
}

function actualizarSeleccion() {
  const precio = getPrecio();
  document.getElementById('cantidadDisplay').textContent = cantidadSeleccionada ?? '-';
  document.getElementById('totalCobrar').textContent =
    cantidadSeleccionada !== null && precio !== null ? `Total a cobrar: ${formatoMoneda(cantidadSeleccionada * precio)}` : '';

  document.querySelectorAll('#tecladoCantidad button').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.cantidad) === cantidadSeleccionada);
  });

  const listo = cantidadSeleccionada !== null && precio !== null;
  document.querySelectorAll('.taq-medio').forEach(btn => { btn.disabled = !listo; });
}

function registrar(medio) {
  const precio = getPrecio();
  if (cantidadSeleccionada === null) {
    mostrarFeedback('Primero seleccione la cantidad de personas.', true);
    return;
  }
  if (precio === null) {
    mostrarFeedback('Primero configure el precio de la entrada.', true);
    return;
  }

  try {
    window.storageManager.addRegistroTaquilla(cantidadSeleccionada, medio);
  } catch (e) {
    mostrarFeedback('Error al guardar el registro.', true);
    return;
  }

  mostrarFeedback(`¡Registrado! ${cantidadSeleccionada} persona(s) con ${medio}: ${formatoMoneda(cantidadSeleccionada * precio)}.`);
  cantidadSeleccionada = null;
  actualizarSeleccion();
  renderResumen();
}

// --- RESUMEN ---
function renderResumen() {
  const resumen = window.storageManager.resumenTaquilla();

  document.getElementById('statRecaudado').textContent = formatoMoneda(resumen.total.recaudado);
  document.getElementById('statPersonas').textContent = `${resumen.total.personas} persona(s)`;

  document.getElementById('statsPorMedio').innerHTML = window.storageManager.mediosPago.map(medio => `
    <div class="taq-stat">
      <span class="taq-stat-titulo">${medio}</span>
      <span class="taq-stat-valor">${formatoMoneda(resumen.porMedio[medio].recaudado)}</span>
      <span class="taq-stat-sub">${resumen.porMedio[medio].personas} persona(s)</span>
    </div>
  `).join('');

  const { registros } = window.storageManager.getTaquilla();
  const tbody = document.querySelector('#registrosTable tbody');
  tbody.innerHTML = '';
  document.getElementById('registros-feedback').style.display = registros.length === 0 ? 'block' : 'none';
  document.getElementById('btnExportarCSV').disabled = registros.length === 0;
  document.getElementById('btnNuevoEvento').disabled = registros.length === 0;

  registros.slice().reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(r.hora).toLocaleTimeString('es-CO', { timeStyle: 'short' })}</td>
      <td>${r.cantidad}</td>
      <td>${escaparHTML(r.medio)}</td>
      <td>${formatoMoneda(r.cantidad * r.precioUnitario)}</td>
      <td><button class="nav-btn btn-small btn-delete">Borrar</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => borrarRegistro(r.id));
    tbody.appendChild(tr);
  });
}

function borrarRegistro(id) {
  if (confirm('¿Borrar este registro de entrada?')) {
    window.storageManager.deleteRegistroTaquilla(id);
    renderResumen();
  }
}

function iniciarNuevoEvento() {
  const { registros } = window.storageManager.getTaquilla();
  if (registros.length === 0) return;
  if (confirm('Se borrarán todos los registros de taquilla de este evento. Si los necesitas, expórtalos a CSV primero. ¿Continuar?')) {
    window.storageManager.resetTaquilla();
    renderResumen();
  }
}

function exportarCSV() {
  const { registros } = window.storageManager.getTaquilla();
  if (registros.length === 0) return;

  // Las fechas en es-CO llevan coma, así que cada campo va entre comillas.
  const csvField = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const headers = ["Hora Entrada", "Cantidad Personas", "Medio de Pago", "Precio Unitario", "Total"];
  const rows = registros.map(r => [
    new Date(r.hora).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' }),
    r.cantidad,
    r.medio,
    r.precioUnitario,
    r.cantidad * r.precioUnitario
  ].map(csvField).join(','));

  // BOM para que Excel lea bien las tildes (p. ej. "Datáfono").
  const csv = "﻿" + [headers.map(csvField).join(','), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `taquilla_mambo_candela_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- HELPERS ---
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatoMoneda(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

let feedbackTimer;
function mostrarFeedback(mensaje, esError = false) {
  const el = document.getElementById('feedbackMessage');
  el.textContent = mensaje;
  el.className = esError ? 'feedback-message error' : 'feedback-message success';
  el.style.display = 'block';
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => el.style.display = 'none', 3000);
}
