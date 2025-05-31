// script.js - Mambo Candela Finance Calculator v3

// Asegurarse de que jspdf esté disponible globalmente si se carga mediante script tag
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    // --- EVENT LISTENERS ---
    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', calcularYGenerarInforme);
    }

    // Listeners para los nuevos botones de acción (se activan después de calcular)
    const btnEnviarCorreo = document.getElementById('btnEnviarCorreo');
    if (btnEnviarCorreo) {
        btnEnviarCorreo.addEventListener('click', enviarInformePorCorreo);
    }

    const btnDescargarPDF = document.getElementById('btnDescargarPDF');
    if (btnDescargarPDF) {
        btnDescargarPDF.addEventListener('click', descargarInformePDF);
    }

    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', imprimirInforme);
    }

    const btnCompartirWhatsApp = document.getElementById('btnCompartirWhatsApp');
    if (btnCompartirWhatsApp) {
        btnCompartirWhatsApp.addEventListener('click', compartirInformeWhatsApp);
    }
});


// --- VARIABLES GLOBALES PARA EL INFORME ---
let informeCalculado = {}; // Almacenará los datos del último informe calculado
let nombreDelEvento = ""; // Almacenará el nombre del evento

// --- FUNCIÓN DE FEEDBACK ---
function mostrarFeedback(mensaje, esError = false) {
  const feedbackEl = document.getElementById('feedbackMessage');
  if (!feedbackEl) return;
  feedbackEl.textContent = mensaje;
  feedbackEl.className = esError ? 'feedback-message error' : 'feedback-message success';
  feedbackEl.style.display = 'block';
  setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 7000);
}

// --- FUNCIÓN PRINCIPAL DE CÁLCULO Y VISUALIZACIÓN ---
function calcularYGenerarInforme() {
  // --- I. ENTRADAS DEL USUARIO ---
  const cajaMenorInicial = Number(document.getElementById('cajaMenorInicial').value) || 0;
  const totalEfectivoContadoAlFinal = Number(document.getElementById('efectivoFinal').value) || 0;
  const ingresosDatafonoBruto = Number(document.getElementById('datafono').value) || 0;
  const ingresosDaviplata = Number(document.getElementById('daviplata').value) || 0;
  const ingresosNequi = Number(document.getElementById('nequi').value) || 0;
  
  const manillasVendidas = Number(document.getElementById('vendidas').value) || 0;
  const precioCover = Number(document.getElementById('precioCover').value) || 0;
  const numeroMusicos = Number(document.getElementById('musicos').value) || 1;
  nombreDelEvento = document.getElementById('nombreEvento').value.trim();

  // --- II. PARÁMETROS FIJOS DEL EVENTO ---
  const costoEnsayo = 60000;
  const costoTotalPaqueteManillas = 52000;
  const costoUnitarioManilla = costoTotalPaqueteManillas / 200;
  const comisionDatafonoPct = 5;
  const reservaBandaPct = 7;
  const honorarioRecaudadorPct = 7;

  // --- III. CÁLCULOS FINANCIEROS ---
  const efectivoRecaudadoDelEvento = totalEfectivoContadoAlFinal - cajaMenorInicial;
  const valorComisionDatafono = ingresosDatafonoBruto * (comisionDatafonoPct / 100);
  const ingresosDatafonoNeto = ingresosDatafonoBruto - valorComisionDatafono;
  const totalIngresosBrutosEvento = ingresosDatafonoNeto + ingresosDaviplata + ingresosNequi + efectivoRecaudadoDelEvento;
  const gastoManillasVendidas = costoUnitarioManilla * manillasVendidas;
  const gastosOperativosTotales = costoEnsayo + gastoManillasVendidas;
  const ingresoNetoOperativo = totalIngresosBrutosEvento - gastosOperativosTotales;
  const montoReservaBanda = ingresoNetoOperativo > 0 ? ingresoNetoOperativo * (reservaBandaPct / 100) : 0;
  const ingresoDespuesReserva = ingresoNetoOperativo - montoReservaBanda;
  const montoHonorarioRecaudador = ingresoDespuesReserva > 0 ? ingresoDespuesReserva * (honorarioRecaudadorPct / 100) : 0;
  const ingresoNetoDisponibleMusicos = ingresoDespuesReserva - montoHonorarioRecaudador;
  const honorarioPorMusico = numeroMusicos > 0 && ingresoNetoDisponibleMusicos > 0 ? ingresoNetoDisponibleMusicos / numeroMusicos : 0;
  const ingresoEsperadoPorCover = manillasVendidas * precioCover;
  const diferenciaIngresoEsperadoVsReal = totalIngresosBrutosEvento - ingresoEsperadoPorCover;

  // Almacenar los resultados para usarlos en otras funciones
  informeCalculado = {
    nombreDelEvento,
    cajaMenorInicial, totalEfectivoContadoAlFinal, efectivoRecaudadoDelEvento,
    ingresosDatafonoBruto, valorComisionDatafono, comisionDatafonoPct, ingresosDatafonoNeto,
    ingresosDaviplata, ingresosNequi, totalIngresosBrutosEvento,
    manillasVendidas, precioCover, ingresoEsperadoPorCover, diferenciaIngresoEsperadoVsReal,
    costoEnsayo, costoUnitarioManilla, gastoManillasVendidas, gastosOperativosTotales,
    ingresoNetoOperativo, reservaBandaPct, montoReservaBanda, ingresoDespuesReserva,
    honorarioRecaudadorPct, montoHonorarioRecaudador, ingresoNetoDisponibleMusicos,
    numeroMusicos, honorarioPorMusico
  };

  // --- IV. GENERACIÓN DE INFORME HTML ---
  const outputEl = document.getElementById('output');
  const nombreEventoResultadoEl = document.getElementById('nombreEventoResultado');
  if (!outputEl || !nombreEventoResultadoEl) return;

  nombreEventoResultadoEl.textContent = nombreDelEvento ? nombreDelEvento : "Evento General";
  
  let htmlInforme = '';
  htmlInforme += `<div class="report-section"><h3>Flujo de Caja y Efectivo:</h3>`;
  htmlInforme += `<p><strong>A. Caja Menor Inicial (Base entregada):</strong> $${formatoMoneda(cajaMenorInicial)}</p>`;
  htmlInforme += `<p><strong>B. Total Efectivo Contado al Finalizar:</strong> $${formatoMoneda(totalEfectivoContadoAlFinal)}</p>`;
  htmlInforme += `<p><strong>C. Efectivo Recaudado en el Evento (B - A):</strong> $${formatoMoneda(efectivoRecaudadoDelEvento)}</p>`;
  htmlInforme += `<p><strong>D. Devolución de Caja Menor Inicial:</strong> $${formatoMoneda(cajaMenorInicial)} (Este monto se retorna de B)</p></div>`;
  
  htmlInforme += `<div class="report-section"><h3>Ingresos del Evento:</h3>`;
  htmlInforme += `<p>1. Ingresos por Datáfono (Bruto): $${formatoMoneda(ingresosDatafonoBruto)}</p>`;
  htmlInforme += `<p>&nbsp;&nbsp;&nbsp;Comisión Datáfono (${comisionDatafonoPct}%): -$${formatoMoneda(valorComisionDatafono)}</p>`;
  htmlInforme += `<p class="subtotal">&nbsp;&nbsp;&nbsp;<strong>Neto Datáfono:</strong> $${formatoMoneda(ingresosDatafonoNeto)}</p>`;
  htmlInforme += `<p>2. Ingresos por Daviplata: $${formatoMoneda(ingresosDaviplata)}</p>`;
  htmlInforme += `<p>3. Ingresos por Nequi: $${formatoMoneda(ingresosNequi)}</p>`;
  htmlInforme += `<p>4. Efectivo Recaudado en el Evento (ver C arriba): $${formatoMoneda(efectivoRecaudadoDelEvento)}</p>`;
  htmlInforme += `<p class="total-emphasis"><strong>TOTAL INGRESOS BRUTOS DEL EVENTO:</strong> $${formatoMoneda(totalIngresosBrutosEvento)}</p></div>`;

  htmlInforme += `<div class="report-section"><h3>Gastos y Distribución:</h3>`;
  htmlInforme += `<p>5. Gasto Sala de Ensayo: -$${formatoMoneda(costoEnsayo)}</p>`;
  htmlInforme += `<p>&nbsp;&nbsp;&nbsp;Costo Unitario Manilla: $${formatoMoneda(costoUnitarioManilla)}</p>`;
  htmlInforme += `<p>&nbsp;&nbsp;&nbsp;Gasto Manillas Vendidas (${manillasVendidas} uds.): -$${formatoMoneda(gastoManillasVendidas)}</p>`;
  htmlInforme += `<p class="subtotal"><strong>Subtotal Gastos Operativos:</strong> -$${formatoMoneda(gastosOperativosTotales)}</p>`;
  htmlInforme += `<p class="total-emphasis"><strong>INGRESO NETO OPERATIVO:</strong> $${formatoMoneda(ingresoNetoOperativo)}</p>`;
  
  htmlInforme += `<p>6. Reserva Fondo Banda (${reservaBandaPct}% de Ing. Neto Op.): -$${formatoMoneda(montoReservaBanda)}</p>`;
  htmlInforme += `<p>&nbsp;&nbsp;&nbsp;<strong>Ingreso Después de Reserva:</strong> $${formatoMoneda(ingresoDespuesReserva)}</p>`;
  htmlInforme += `<p>7. Honorarios Recaudador (${honorarioRecaudadorPct}% de Ing. Después Reserva): -$${formatoMoneda(montoHonorarioRecaudador)}</p>`;
  htmlInforme += `<p class="total-emphasis"><strong>INGRESO NETO DISPONIBLE PARA MÚSICOS:</strong> $${formatoMoneda(ingresoNetoDisponibleMusicos)}</p>`;
  htmlInforme += `<p>8. Honorario por Músico (${numeroMusicos} músicos): $${formatoMoneda(honorarioPorMusico)}</p></div>`;

  htmlInforme += `<div class="report-section"><h3>Verificación Adicional:</h3>`;
  htmlInforme += `<p>9. Ingreso Esperado por Cover (${manillasVendidas} manillas a $${formatoMoneda(precioCover)}): $${formatoMoneda(ingresoEsperadoPorCover)}</p>`;
  htmlInforme += `<p>&nbsp;&nbsp;&nbsp;Diferencia (Ing. Bruto Evento - Ing. Esperado Cover): $${formatoMoneda(diferenciaIngresoEsperadoVsReal)}</p></div>`;

  outputEl.innerHTML = htmlInforme;
  const resultadosDiv = document.getElementById('resultados');
  if(resultadosDiv) resultadosDiv.style.display = 'block';
  mostrarFeedback('Informe calculado y generado.', false);
}

// --- FUNCIONES DE ACCIÓN DEL INFORME ---

function formatoMoneda(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function generarTextoPlanoInforme(incluirNombreEvento = true) {
    if (Object.keys(informeCalculado).length === 0) return "No hay informe para procesar.";
    const ic = informeCalculado; // Alias
    let texto = "";
    if(incluirNombreEvento && nombreDelEvento) texto += `Informe Financiero: ${nombreDelEvento}\n\n`;
    else if (incluirNombreEvento) texto += `Informe Financiero Evento Mambo Candela\n\n`;

    texto += `FLUJO DE CAJA Y EFECTIVO:\n`;
    texto += `A. Caja Menor Inicial: ${formatoMoneda(ic.cajaMenorInicial)}\n`;
    texto += `B. Total Efectivo Contado al Final: ${formatoMoneda(ic.totalEfectivoContadoAlFinal)}\n`;
    texto += `C. Efectivo Recaudado Evento: ${formatoMoneda(ic.efectivoRecaudadoDelEvento)}\n`;
    texto += `D. Devolución Caja Menor: ${formatoMoneda(ic.cajaMenorInicial)}\n\n`;

    texto += `INGRESOS DEL EVENTO:\n`;
    texto += `1. Neto Datáfono: ${formatoMoneda(ic.ingresosDatafonoNeto)} (Comisión ${ic.comisionDatafonoPct}%: -${formatoMoneda(ic.valorComisionDatafono)} sobre Bruto $${formatoMoneda(ic.ingresosDatafonoBruto)})\n`;
    texto += `2. Daviplata: ${formatoMoneda(ic.ingresosDaviplata)}\n`;
    texto += `3. Nequi: ${formatoMoneda(ic.ingresosNequi)}\n`;
    texto += `4. Efectivo Recaudado: ${formatoMoneda(ic.efectivoRecaudadoDelEvento)}\n`;
    texto += `TOTAL INGRESOS BRUTOS EVENTO: ${formatoMoneda(ic.totalIngresosBrutosEvento)}\n\n`;

    texto += `GASTOS Y DISTRIBUCIÓN:\n`;
    texto += `5. Gastos Operativos (Ensayo, Manillas): -${formatoMoneda(ic.gastosOperativosTotales)}\n`;
    texto += `INGRESO NETO OPERATIVO: ${formatoMoneda(ic.ingresoNetoOperativo)}\n`;
    texto += `6. Reserva Banda (${ic.reservaBandaPct}%): -${formatoMoneda(ic.montoReservaBanda)}\n`;
    texto += `Ingreso Después Reserva: ${formatoMoneda(ic.ingresoDespuesReserva)}\n`;
    texto += `7. Honorarios Recaudador (${ic.honorarioRecaudadorPct}%): -${formatoMoneda(ic.montoHonorarioRecaudador)}\n`;
    texto += `INGRESO NETO DISPONIBLE MÚSICOS: ${formatoMoneda(ic.ingresoNetoDisponibleMusicos)}\n`;
    texto += `8. Honorario por Músico (${ic.numeroMusicos}): ${formatoMoneda(ic.honorarioPorMusico)}\n\n`;
    
    texto += `VERIFICACIÓN:\n`;
    texto += `Ingreso Esperado Cover (${ic.manillasVendidas} x ${formatoMoneda(ic.precioCover)}): ${formatoMoneda(ic.ingresoEsperadoPorCover)}\n`;
    texto += `Diferencia vs Ing. Bruto: ${formatoMoneda(ic.diferenciaIngresoEsperadoVsReal)}\n`;
    return texto;
}


function enviarInformePorCorreo() {
  if (Object.keys(informeCalculado).length === 0) {
    mostrarFeedback("Primero calcula un informe.", true);
    return;
  }
  const asunto = encodeURIComponent(nombreDelEvento ? `Informe Financiero: ${nombreDelEvento}` : "Informe Financiero Evento Mambo Candela");
  const cuerpo = encodeURIComponent(generarTextoPlanoInforme());
  window.location.href = `mailto:?subject=${asunto}&body=${cuerpo}`;
}

function descargarInformePDF() {
  if (Object.keys(informeCalculado).length === 0) {
    mostrarFeedback("Primero calcula un informe.", true);
    return;
  }
  const { jsPDF } = window.jspdf;
  const reportContent = document.getElementById('output');
  const reportTitleOriginal = document.querySelector('.results h2').innerText;
  
  if (!reportContent) {
      mostrarFeedback("Contenido del informe no encontrado.", true);
      return;
  }

  mostrarFeedback("Generando PDF...", false);

  // Clonar el contenido para no afectar la vista actual y añadir título
  const contentToPrint = reportContent.cloneNode(true);
  const titleEl = document.createElement('h2');
  titleEl.innerText = reportTitleOriginal;
  titleEl.style.textAlign = 'center';
  titleEl.style.color = '#C8102E'; // Color primario
  titleEl.style.fontFamily = 'Montserrat, sans-serif';
  titleEl.style.marginBottom = '20px';
  contentToPrint.insertBefore(titleEl, contentToPrint.firstChild);
  
  // Añadir estilos directamente para el PDF si es necesario o usar html2canvas
  // Para mejor fidelidad visual, html2canvas es preferible
  html2canvas(contentToPrint, {
      scale: 2, // Mejorar resolución
      useCORS: true,
      logging: true,
      onclone: (documentClone) => {
          // Aquí podrías aplicar estilos específicos para el clon antes de renderizar
          // Por ejemplo, asegurar que los colores de fondo se impriman
          Array.from(documentClone.querySelectorAll('.report-section')).forEach(el => {
              el.style.border = '1px solid #eee';
              el.style.padding = '10px';
              el.style.marginBottom = '10px';
          });
          Array.from(documentClone.querySelectorAll('.total-emphasis')).forEach(el => {
              el.style.fontWeight = 'bold';
              el.style.backgroundColor = '#f0f0f0'; // Un fondo claro
              el.style.padding = '5px';
              el.style.borderLeft = '3px solid #C8102E'; // Color primario
          });
      }
  }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4'
      });
      const imgProps= pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let position = 0;
      const pageMargin = 10; // Margen de 10mm en todas las direcciones
      const contentWidth = pdfWidth - (2 * pageMargin);
      const contentHeight = pdf.internal.pageSize.getHeight() - (2 * pageMargin);
      
      let heightLeft = pdfHeight;

      pdf.addImage(imgData, 'PNG', pageMargin, pageMargin, contentWidth, pdfHeight * (contentWidth / imgProps.width) );
      heightLeft -= contentHeight;

      while (heightLeft > 0) {
          position = heightLeft - pdfHeight; // Avanza la posición
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', pageMargin, position + pageMargin, contentWidth, pdfHeight * (contentWidth / imgProps.width));
          heightLeft -= contentHeight;
      }

      pdf.save(`${nombreDelEvento.replace(/\s+/g, '_') || 'Informe_Financiero'}_Mambo_Candela.pdf`);
      mostrarFeedback("PDF generado y descargado.", false);
  }).catch(err => {
      console.error("Error al generar PDF:", err);
      mostrarFeedback("Error al generar PDF: " + err.message, true);
  });
}


function imprimirInforme() {
  if (Object.keys(informeCalculado).length === 0) {
    mostrarFeedback("Primero calcula un informe.", true);
    return;
  }
  // Se podría crear un iframe temporal con el contenido y estilos de impresión
  // o usar @media print CSS. Por simplicidad, usaremos window.print()
  // y asumiremos que los estilos de `styles.css` (@media print) manejan el formato.
  
  // Opcional: clonar el contenido y aplicar estilos específicos para impresión
  // antes de llamar a window.print().
  // Por ahora, impresión directa del contenido visible.
  window.print();
}

function compartirInformeWhatsApp() {
  if (Object.keys(informeCalculado).length === 0) {
    mostrarFeedback("Primero calcula un informe.", true);
    return;
  }
  let textoWhatsApp = "*Informe Financiero Mambo Candela*\n";
  if (nombreDelEvento) {
    textoWhatsApp = `*Informe: ${nombreDelEvento}*\n`;
  }
  textoWhatsApp += `\nResumen Clave:\n`;
  textoWhatsApp += `Total Ingresos Brutos: ${formatoMoneda(informeCalculado.totalIngresosBrutosEvento)}\n`;
  textoWhatsApp += `Gastos Operativos: -${formatoMoneda(informeCalculado.gastosOperativosTotales)}\n`;
  textoWhatsApp += `Ingreso Neto Operativo: ${formatoMoneda(informeCalculado.ingresoNetoOperativo)}\n`;
  textoWhatsApp += `Reserva Banda: -${formatoMoneda(informeCalculado.montoReservaBanda)}\n`;
  textoWhatsApp += `Honorarios Recaudador: -${formatoMoneda(informeCalculado.montoHonorarioRecaudador)}\n`;
  textoWhatsApp += `*Disponible Músicos: ${formatoMoneda(informeCalculado.ingresoNetoDisponibleMusicos)}*\n`;
  textoWhatsApp += `*Honorario por Músico (${informeCalculado.numeroMusicos}): ${formatoMoneda(informeCalculado.honorarioPorMusico)}*\n\n`;
  textoWhatsApp += `Caja Menor Inicial: ${formatoMoneda(informeCalculado.cajaMenorInicial)}\n`;
  textoWhatsApp += `Efectivo Recaudado Evento: ${formatoMoneda(informeCalculado.efectivoRecaudadoDelEvento)}\n`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`;
  window.open(whatsappUrl, '_blank');
}

// --- ESTILOS ADICIONALES Y PARA IMPRESIÓN ---
// (Puedes mover esto a styles.css si prefieres)
const style = document.createElement('style');
style.textContent = `
  .feedback-message {
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    transition: opacity 0.5s ease-out;
  }
  .feedback-message.success {
    background-color: #e6ffed;
    color: #2f5c3b;
    border: 1px solid #a1e7b6;
  }
  .feedback-message.error {
    background-color: #ffe6e6;
    color: #c8102e; /* Color primario para errores */
    border: 1px solid #f5c6cb;
  }
  .report-section {
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #ccc;
  }
  .report-section:last-child {
    border-bottom: none;
  }
  .report-section h3 {
    color: var(--color-primary);
    margin-top: 0;
  }
  .report-section p {
    margin: 5px 0;
    line-height: 1.5;
  }
  .subtotal {
    /* Estilo para subtotales si es necesario */
  }
  .total-emphasis {
    font-weight: bold;
    color: #333;
    background-color: #f0f0f0;
    padding: 5px 8px;
    margin-top: 5px;
    border-left: 3px solid var(--color-primary);
    display: inline-block; /* Para que el fondo no ocupe todo el ancho */
  }
  .report-actions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
  .action-buttons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }
  .action-buttons-grid button {
    background-color: var(--color-secondary); /* Un color diferente para acciones secundarias */
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .action-buttons-grid button:hover {
    background-color: #555; /* Un poco más oscuro al pasar el mouse */
  }
  .action-buttons-grid button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  .action-buttons-grid button img.icon {
    width: 18px; /* Ajusta según el tamaño de tus iconos */
    height: 18px;
  }
  .main-action-button { /* Estilo para el botón principal de calcular */
    background-color: var(--color-primary);
    color: #fff;
    font-family: var(--font-heading);
    font-size: 1.1rem;
    font-weight: 700;
    padding: 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 20px; /* Ajustado */
    transition: background-color 0.2s;
    width:100%;
  }
  .main-action-button:hover {
    background-color: #a10f25;
  }

  @media print {
    body {
      margin: 20mm; /* Márgenes para impresión */
      padding: 0;
      font-size: 10pt; /* Tamaño de fuente para impresión */
      color: #000; /* Asegurar texto negro */
    }
    .site-header, #btnCalcular, .report-actions, .grid, h1:first-of-type, #feedbackMessage, title {
      display: none !important; /* Ocultar elementos no necesarios */
    }
    .results {
      display: block !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .results h2 {
        font-size: 16pt;
        text-align: center;
    }
    .report-content p, .report-content h3 {
        page-break-inside: avoid; /* Evitar saltos de página dentro de párrafos o secciones pequeñas */
    }
    .report-section {
        border-bottom: 1px solid #ccc; /* Líneas más sutiles para impresión */
    }
    .total-emphasis {
        background-color: #eee !important; /* Asegurar que los fondos se impriman si es posible */
        -webkit-print-color-adjust: exact; /* Para Chrome/Safari */
        color-adjust: exact; /* Estándar */
    }
    a { text-decoration: none; color: #000; } /* Evitar subrayados y colores en enlaces */
  }
`;
document.head.appendChild(style);
