// script.js - Mambo Candela Finance Calculator

document.getElementById('btnCalcular').addEventListener('click', calcular);

function calcular() {
  // Inputs
  const pagoTarjeta = Number(document.getElementById('datafono').value) || 0;
  const pagoDaviplata = Number(document.getElementById('daviplata').value) || 0;
  const pagoNequi = Number(document.getElementById('nequi').value) || 0;
  const pagoEfectivo = Number(document.getElementById('efectivo').value) || 0;
  const ticketsVendidos = Number(document.getElementById('vendidas').value) || 0;
  const precioEntrada = Number(document.getElementById('precioCover').value) || 0;
  const numeroMusicos = Number(document.getElementById('musicos').value) || 1;
  const email = document.getElementById('email').value.trim();

  // Costos pre-evento
  const costoEnsayo = 60000;           // Costo sala de ensayo (2h)
  const costoTotalManillas = 65000;    // Costo total de 200 manillas
  const costoUnitarioManilla = costoTotalManillas / 200;

  // Parámetros del evento
  const comisionTarjetaPct = 5;        // % comisión datáfono
  const fondoCambio = 150000;          // Fondo para cambio inicial
  const reservaBandaPct = 7;           // % reserva para fondo de la banda
  const honorarioRecaudadorPct = 8;    // % para persona que recauda

  // 1) Neto por tarjeta tras comisión
  const comisionTarjeta = pagoTarjeta * (comisionTarjetaPct / 100);
  const netoTarjeta = pagoTarjeta - comisionTarjeta;

  // 2) Suma de ingresos: neto tarjeta + otros pagos
  const ingresoBruto = netoTarjeta + pagoDaviplata + pagoNequi + pagoEfectivo;

  // 3) Ingreso neto inicial tras restar fondo para cambio
  const ingresoTrasCambio = ingresoBruto - fondoCambio;

  // 4) Gastos pre-evento: ensayo y manillas vendidas
  const gastoManillas = costoUnitarioManilla * ticketsVendidos;
  const ingresoTrasGastos = ingresoTrasCambio - costoEnsayo - gastoManillas;

  // 5) Reserva de fondo de banda
  const montoReservaBanda = ingresoTrasGastos * (reservaBandaPct / 100);
  const ingresoDespuesReserva = ingresoTrasGastos - montoReservaBanda;

  // 6) Honorarios del recaudador
  const montoHonorarioRecaudador = ingresoDespuesReserva * (honorarioRecaudadorPct / 100);
  const ingresoDisponible = ingresoDespuesReserva - montoHonorarioRecaudador;

  // 7) Cálculo honorario individual
  const honorarioPorMusico = ingresoDisponible / numeroMusicos;

  // 8) Ingreso esperado y diferencia sin descuentos (solo restando fondo cambio)
  const ingresoEsperado = ticketsVendidos * precioEntrada;
  const diferenciaEsperadoVsReal = ingresoTrasCambio - ingresoEsperado;

  // Generar informe HTML
  let html = '';
  html += `<div class="result-item"><strong>1. Neto Tarjeta (5% comisión):</strong> $${netoTarjeta.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>2. Ingreso bruto total:</strong> $${ingresoBruto.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>3. Ingreso tras fondo de cambio ($${fondoCambio}):</strong> $${ingresoTrasCambio.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>4. Gastos pre-evento:</strong> Ensayo $${costoEnsayo.toFixed(2)}, Manillas $${gastoManillas.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>   → Ingreso tras gastos:</strong> $${ingresoTrasGastos.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>5. Reserva Banda (${reservaBandaPct}%):</strong> $${montoReservaBanda.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>   → Ingreso tras reserva:</strong> $${ingresoDespuesReserva.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>6. Honorario Recaudador (${honorarioRecaudadorPct}%):</strong> $${montoHonorarioRecaudador.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>   → Ingreso disponible para músicos:</strong> $${ingresoDisponible.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>7. Honorario por músico (${numeroMusicos}):</strong> $${honorarioPorMusico.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>8. Ingreso esperado (${ticketsVendidos}×$${precioEntrada}):</strong> $${ingresoEsperado.toFixed(2)}</div>`;
  html += `<div class="result-item"><strong>   → Diferencia vs. ingreso tras cambio:</strong> $${diferenciaEsperadoVsReal.toFixed(2)}</div>`;

  document.getElementById('output').innerHTML = html;
  document.getElementById('resultados').style.display = 'block';

  // Envío por correo
  if (email) {
    const informe = {
      netoTarjeta,
      ingresoBruto,
      ingresoTrasCambio,
      costoEnsayo,
      gastoManillas,
      ingresoTrasGastos,
      montoReservaBanda,
      ingresoDespuesReserva,
      montoHonorarioRecaudador,
      ingresoDisponible,
      honorarioPorMusico,
      ingresoEsperado,
      diferenciaEsperadoVsReal,
      comisionTarjetaPct,
      reservaBandaPct,
      honorarioRecaudadorPct,
      numeroMusicos,
      ticketsVendidos,
      precioEntrada,
      email
    };
    fetch('https://julianguacaneme.com/calculadora-evento/enviar_informe.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(informe)
    })
    .then(res => res.json())
    .then(data => alert(data.success ? `Informe enviado a ${email}` : `Error al enviar: ${data.error}`))
    .catch(() => alert('Error de conexión al enviar informe'));
  }
}
