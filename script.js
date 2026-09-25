// script.js - Mambo Candela Finance Calculator v4 (with Dashboard)

document.addEventListener('DOMContentLoaded', () => {
  // --- INICIALIZACIÓN ---
  initNavigation();
  loadConfigurationToView();
  loadHistoryToView();

  // --- EVENT LISTENERS PRINCIPALES ---
  const btnCalcular = document.getElementById('btnCalcular');
  if (btnCalcular) {
    btnCalcular.addEventListener('click', calcularYGenerarInforme);
  }

  const btnGuardarConfig = document.getElementById('btnGuardarConfig');
  if (btnGuardarConfig) {
    btnGuardarConfig.addEventListener('click', guardarConfiguracion);
  }

  setupReportActions();
});

// --- VARIABLES GLOBALES ---
let informeCalculado = {};
let nombreDelEvento = "";

// --- NAVEGACIÓN ---
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.view-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// --- CONFIGURACIÓN ---
function loadConfigurationToView() {
  const config = window.storageManager.getConfig();
  if (!config) return;

  setInputVal('cfg-costoEnsayo', config.costoEnsayo);
  setInputVal('cfg-unidadesPorPaqueteManillas', config.unidadesPorPaqueteManillas);
  setInputVal('cfg-costoPaqueteManillas', config.costoPaqueteManillas);
  setInputVal('cfg-honorarioRecaudadorPct', config.honorarioRecaudadorPct);
  setInputVal('cfg-reservaBandaPct', config.reservaBandaPct);
  setInputVal('cfg-pagoRodie', config.pagoRodie);
}

function guardarConfiguracion() {
  const newConfig = {
    costoEnsayo: getInputVal('cfg-costoEnsayo'),
    unidadesPorPaqueteManillas: getInputVal('cfg-unidadesPorPaqueteManillas'),
    costoPaqueteManillas: getInputVal('cfg-costoPaqueteManillas'),
    honorarioRecaudadorPct: getInputVal('cfg-honorarioRecaudadorPct'),
    reservaBandaPct: getInputVal('cfg-reservaBandaPct'),
    pagoRodie: getInputVal('cfg-pagoRodie')
  };

  const saved = window.storageManager.saveConfig(newConfig);
  if (saved) {
    mostrarFeedback("Configuración guardada correctamente.", false, 'configFeedback');
  } else {
    mostrarFeedback("Error al guardar configuración.", true, 'configFeedback');
  }
}

// --- CÁLCULO ---
function calcularYGenerarInforme() {
  // 1. Entradas Variables
  const cajaMenorInicial = getInputVal('cajaMenorInicial');
  const totalEfectivoContadoAlFinal = getInputVal('efectivoFinal');
  // El valor del datáfono ya viene neto (lo que reporta la app del datáfono tras comisiones)
  const ingresosDatafono = getInputVal('datafono');
  const ingresosDaviplata = getInputVal('daviplata');
  const ingresosNequi = getInputVal('nequi');
  const manillasVendidas = getInputVal('vendidas');
  const precioCover = getInputVal('precioCover');
  const numeroMusicos = getInputVal('musicos') || 1;
  const numeroRodies = getInputVal('rodies') || 0;
  const numeroEnsayos = getInputVal('ensayos') || 0;
  nombreDelEvento = document.getElementById('nombreEvento').value.trim();

  // 2. Parámetros Fijos
  const config = window.storageManager.getConfig();

  // 3. Cálculos
  const unidadesPorPaquete = config.unidadesPorPaqueteManillas || 200;
  const costoUnitarioManilla = config.costoPaqueteManillas / unidadesPorPaquete;

  const efectivoRecaudadoDelEvento = totalEfectivoContadoAlFinal - cajaMenorInicial;
  const totalIngresosBrutosEvento = ingresosDatafono + ingresosDaviplata + ingresosNequi + efectivoRecaudadoDelEvento;

  const gastoManillasVendidas = costoUnitarioManilla * manillasVendidas;
  const costoTotalEnsayos = config.costoEnsayo * numeroEnsayos;
  const costoTotalRodies = (config.pagoRodie || 0) * numeroRodies;
  const gastosOperativosTotales = costoTotalEnsayos + gastoManillasVendidas + costoTotalRodies;
  const ingresoNetoOperativo = totalIngresosBrutosEvento - gastosOperativosTotales;

  const montoReservaBanda = ingresoNetoOperativo > 0 ? ingresoNetoOperativo * (config.reservaBandaPct / 100) : 0;
  const ingresoDespuesReserva = ingresoNetoOperativo - montoReservaBanda;

  const montoHonorarioRecaudador = ingresoDespuesReserva > 0 ? ingresoDespuesReserva * (config.honorarioRecaudadorPct / 100) : 0;
  const ingresoNetoDisponibleMusicos = ingresoDespuesReserva - montoHonorarioRecaudador;
  const honorarioPorMusico = numeroMusicos > 0 && ingresoNetoDisponibleMusicos > 0 ? ingresoNetoDisponibleMusicos / numeroMusicos : 0;

  const ingresoEsperadoPorCover = manillasVendidas * precioCover;
  const diferenciaIngresoEsperadoVsReal = ingresoEsperadoPorCover - totalIngresosBrutosEvento;

  informeCalculado = {
    fechaCalculo: new Date().toISOString(),
    nombreDelEvento: nombreDelEvento || "Evento Sin Nombre",
    cajaMenorInicial, totalEfectivoContadoAlFinal, efectivoRecaudadoDelEvento,
    ingresosDatafono, ingresosDaviplata, ingresosNequi,
    manillasVendidas, precioCover, numeroMusicos, numeroRodies, numeroEnsayos,
    configSnapshot: { ...config },
    totalIngresosBrutosEvento,
    gastoManillasVendidas, costoTotalEnsayos, costoTotalRodies, gastosOperativosTotales, ingresoNetoOperativo,
    montoReservaBanda, ingresoDespuesReserva, montoHonorarioRecaudador,
    ingresoNetoDisponibleMusicos, honorarioPorMusico,
    ingresoEsperadoPorCover, diferenciaIngresoEsperadoVsReal
  };

  renderizarInformeHTML();

  const btnDB = document.getElementById('btnGuardarDB');
  if (btnDB) {
    btnDB.disabled = false;
    btnDB.title = "Guardar este evento en el historial";
  }
}

function renderizarInformeHTML() {
  const ic = informeCalculado;
  const outputEl = document.getElementById('output');
  const nombreEventoResultadoEl = document.getElementById('nombreEventoResultado');
  const resultadosDiv = document.getElementById('resultados');

  if (!outputEl) return;

  nombreEventoResultadoEl.textContent = ic.nombreDelEvento;

  let html = `<div class="report-section"><h3>Flujo de Caja y Efectivo:</h3>
    <p><strong>A. Caja Menor Inicial:</strong> ${formatoMoneda(ic.cajaMenorInicial)}</p>
    <p><strong>B. Total Efectivo Final:</strong> ${formatoMoneda(ic.totalEfectivoContadoAlFinal)}</p>
    <p><strong>C. Efectivo Recaudado:</strong> ${formatoMoneda(ic.efectivoRecaudadoDelEvento)}</p>
    </div>`;

  html += `<div class="report-section"><h3>Medios de Pago Digitales:</h3>
    <p><strong>Nequi:</strong> ${formatoMoneda(ic.ingresosNequi)}</p>
    <p><strong>Daviplata:</strong> ${formatoMoneda(ic.ingresosDaviplata)}</p>
    <p><strong>Datáfono (Neto recibido):</strong> ${formatoMoneda(ic.ingresosDatafono)}</p>
    </div>`;

  if (ic.precioCover > 0) {
    html += `<div class="report-section"><h3>Control de Manillas vs. Ingresos:</h3>
    <p><strong>Ingreso Esperado (${ic.manillasVendidas} x ${formatoMoneda(ic.precioCover)}):</strong> ${formatoMoneda(ic.ingresoEsperadoPorCover)}</p>
    <p><strong>Ingreso Real:</strong> ${formatoMoneda(ic.totalIngresosBrutosEvento)}</p>
    <p><strong>Diferencia (Esperado - Real):</strong> ${formatoMoneda(ic.diferenciaIngresoEsperadoVsReal)}</p>
    </div>`;
  }

  html += `<div class="report-section"><h3>Resultados Financieros:</h3>
    <p class="total-emphasis"><strong>TOTAL INGRESOS BRUTOS:</strong> ${formatoMoneda(ic.totalIngresosBrutosEvento)}</p>
    <div class="expense-detail" style="font-size: 0.9em; color: #555; margin-left: 10px;">
        <p>• Sala Ensayo (${ic.numeroEnsayos} x ${formatoMoneda(ic.configSnapshot.costoEnsayo)}): ${formatoMoneda(ic.costoTotalEnsayos)}</p>
        <p>• Costo Manillas (${ic.manillasVendidas} und): ${formatoMoneda(ic.gastoManillasVendidas)}</p>
        ${ic.numeroRodies > 0 ? `<p>• Pago Rodie/Utilero (${ic.numeroRodies} x ${formatoMoneda(ic.configSnapshot.pagoRodie)}): ${formatoMoneda(ic.costoTotalRodies)}</p>` : ''}
    </div>
    <p><strong>Total Gastos Operativos:</strong> -${formatoMoneda(ic.gastosOperativosTotales)}</p>
    <p><strong>Ingreso Neto Operativo:</strong> ${formatoMoneda(ic.ingresoNetoOperativo)}</p>
    <p>Reserva Banda (${ic.configSnapshot.reservaBandaPct}%): -${formatoMoneda(ic.montoReservaBanda)}</p>
    <p>Honorarios Recaudador (${ic.configSnapshot.honorarioRecaudadorPct}%): -${formatoMoneda(ic.montoHonorarioRecaudador)}</p>
    <p class="total-emphasis" style="background-color:#d4edda; border-left-color:#28a745;"><strong>DISPONIBLE MÚSICOS:</strong> ${formatoMoneda(ic.ingresoNetoDisponibleMusicos)}</p>
    <p><strong>Pago por Músico (${ic.numeroMusicos}):</strong> ${formatoMoneda(ic.honorarioPorMusico)}</p>
    </div>`;

  outputEl.innerHTML = html;
  resultadosDiv.style.display = 'block';
  resultadosDiv.scrollIntoView({ behavior: 'smooth' });
  mostrarFeedback('Informe Generado con Éxito.', false);
}

// --- HISTORIAL ---
function loadHistoryToView() {
  const events = window.storageManager.getEvents();
  const tbody = document.querySelector('#eventsTable tbody');
  const emptyState = document.getElementById('history-feedback');

  tbody.innerHTML = '';

  if (events.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  events.forEach(ev => {
    const tr = document.createElement('tr');
    const date = new Date(ev.savedAt).toLocaleDateString();
    tr.innerHTML = `
      <td>${date}</td>
      <td>${escaparHTML(ev.nombreDelEvento)}</td>
      <td>${formatoMoneda(ev.totalIngresosBrutosEvento)}</td>
      <td><strong>${formatoMoneda(ev.ingresoNetoDisponibleMusicos)}</strong></td>
      <td>
        <button class="nav-btn btn-small btn-delete" onclick="borrarEvento('${ev.id}')">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.borrarEvento = function (id) {
  if (confirm('¿Estás seguro de borrar este evento?')) {
    window.storageManager.deleteEvent(id);
    loadHistoryToView();
  }
};

function guardarEventoEnDB() {
  if (!informeCalculado || !informeCalculado.fechaCalculo) return;

  try {
    window.storageManager.saveEvent(informeCalculado);
    mostrarFeedback('Evento guardado en Historial.', false);
    loadHistoryToView();
    document.getElementById('btnGuardarDB').disabled = true;
  } catch (e) {
    mostrarFeedback('Error al guardar.', true);
  }
}

// --- HELPERS ---
function setupReportActions() {
  document.getElementById('btnEnviarCorreo')?.addEventListener('click', enviarInformePorCorreo);
  document.getElementById('btnDescargarPDF')?.addEventListener('click', descargarInformePDF);
  document.getElementById('btnImprimir')?.addEventListener('click', imprimirInforme);
  document.getElementById('btnCompartirWhatsApp')?.addEventListener('click', compartirInformeWhatsApp);

  const btnDB = document.getElementById('btnGuardarDB');
  if (btnDB) {
    btnDB.addEventListener('click', guardarEventoEnDB);
  }
}

function getInputVal(id) {
  const el = document.getElementById(id);
  return el ? Number(el.value) : 0;
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatoMoneda(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function mostrarFeedback(mensaje, esError = false, elementId = 'feedbackMessage') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = mensaje;
  el.className = esError ? 'feedback-message error' : 'feedback-message success';
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

function generarTextoPlanoInforme() {
  if (Object.keys(informeCalculado).length === 0) return "No hay informe.";
  const ic = informeCalculado;
  let t = `Informe: ${ic.nombreDelEvento}\n\n`;
  t += `--- MEDIOS DIGITALES ---\n`;
  t += `Nequi: ${formatoMoneda(ic.ingresosNequi)}\n`;
  t += `Daviplata: ${formatoMoneda(ic.ingresosDaviplata)}\n`;
  t += `Datáfono (Neto recibido): ${formatoMoneda(ic.ingresosDatafono)}\n\n`;
  if (ic.precioCover > 0) {
    t += `--- CONTROL DE MANILLAS ---\n`;
    t += `Ingreso Esperado (${ic.manillasVendidas} x ${formatoMoneda(ic.precioCover)}): ${formatoMoneda(ic.ingresoEsperadoPorCover)}\n`;
    t += `Diferencia (Esperado - Real): ${formatoMoneda(ic.diferenciaIngresoEsperadoVsReal)}\n\n`;
  }
  t += `--- GASTOS OPERATIVOS ---\n`;
  t += `Sala Ensayo (${ic.numeroEnsayos} ens): ${formatoMoneda(ic.costoTotalEnsayos)}\n`;
  t += `Manillas (${ic.manillasVendidas} und): ${formatoMoneda(ic.gastoManillasVendidas)}\n`;
  if (ic.numeroRodies > 0) {
    t += `Utileros (${ic.numeroRodies}): ${formatoMoneda(ic.costoTotalRodies)}\n`;
  }
  t += `Total Gastos: -${formatoMoneda(ic.gastosOperativosTotales)}\n\n`;
  t += `--- RESULTADOS ---\n`;
  t += `Total Ingresos Brutos: ${formatoMoneda(ic.totalIngresosBrutosEvento)}\n`;
  t += `Disponible Músicos: ${formatoMoneda(ic.ingresoNetoDisponibleMusicos)}\n`;
  t += `Pago por Músico: ${formatoMoneda(ic.honorarioPorMusico)}\n`;
  return t;
}

function enviarInformePorCorreo() {
  if (Object.keys(informeCalculado).length === 0) return;
  const asunto = encodeURIComponent(`Informe: ${informeCalculado.nombreDelEvento}`);
  const cuerpo = encodeURIComponent(generarTextoPlanoInforme());
  window.location.href = `mailto:?subject=${asunto}&body=${cuerpo}`;
}

function compartirInformeWhatsApp() {
  if (Object.keys(informeCalculado).length === 0) return;
  const t = generarTextoPlanoInforme();
  window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
}

function imprimirInforme() {
  window.print();
}

function descargarInformePDF() {
  if (Object.keys(informeCalculado).length === 0) return;
  if (!window.jspdf || typeof html2canvas === 'undefined') {
    mostrarFeedback("No se pudo cargar la librería de PDF. Revisa tu conexión.", true);
    return;
  }
  const { jsPDF } = window.jspdf;
  const reportContent = document.getElementById('output');
  if (!reportContent) return;

  mostrarFeedback("Generando PDF...", false);

  html2canvas(reportContent, { scale: 2, useCORS: true }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight);
    pdf.save(`Informe_${informeCalculado.nombreDelEvento.replace(/\s+/g, '_')}.pdf`);
    mostrarFeedback("PDF Descargado.", false);
  });
}
