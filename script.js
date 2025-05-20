document.getElementById('btnCalcular').addEventListener('click', calcular);

function calcular() {
  const daviplata    = +document.getElementById('daviplata').value || 0;
  const nequi        = +document.getElementById('nequi').value    || 0;
  const datafono     = +document.getElementById('datafono').value || 0;
  const efectivo     = +document.getElementById('efectivo').value || 0;
  const vendidas     = +document.getElementById('vendidas').value || 0;
  const precioCover  = +document.getElementById('precioCover').value || 0;
  const musicos      = +document.getElementById('musicos').value  || 1;
  const email        = document.getElementById('email').value.trim();

  // Constantes fijas
  const precioManillas   = 65000;
  const sala             = 65000;
  const transferencia    = 7200;
  const caja             = 150000;
  const pctDatafono      = 4.5;
  const pctRecaudo       = 7;
  const pctAhorro        = 7;

  // Cálculos
  const totalRecaudado     = daviplata + nequi + datafono + efectivo;
  const costoUnitario      = precioManillas / 200;
  const gastoManillas      = costoUnitario * vendidas;
  const comisionDatafono   = datafono * (pctDatafono / 100);
  const gastosTotales      = sala + gastoManillas + comisionDatafono + transferencia;
  const honorariosRecaudo  = totalRecaudado * (pctRecaudo / 100);
  const ingresoNetoParcial = totalRecaudado - gastosTotales - caja;
  const ahorroBanda        = ingresoNetoParcial * (pctAhorro / 100);
  const ingresoFinal       = ingresoNetoParcial - honorariosRecaudo - ahorroBanda;
  const honorario          = ingresoFinal / musicos;

  const ingresoEsperado = vendidas * precioCover;
  const diferencia      = totalRecaudado - ingresoEsperado;

  // Mostrar resultados
  const salida = `
    <div class="result-item">Total recaudado: $${totalRecaudado.toFixed(2)}</div>
    <div class="result-item">Manillas vendidas: ${vendidas}</div>
    <div class="result-item">Ingreso esperado por cover: $${ingresoEsperado.toFixed(2)}</div>
    <div class="result-item">Diferencia entre ingreso y cover: $${diferencia.toFixed(2)}</div>
    <div class="result-item">Costo unitario manilla: $${costoUnitario.toFixed(2)}</div>
    <div class="result-item">Gasto en manillas: $${gastoManillas.toFixed(2)}</div>
    <div class="result-item">Costo sala de ensayo: $${sala.toFixed(2)}</div>
    <div class="result-item">Comisión datáfono (4.5%): $${comisionDatafono.toFixed(2)}</div>
    <div class="result-item">Gastos totales: $${gastosTotales.toFixed(2)}</div>
    <div class="result-item">Honorarios persona que recauda: $${honorariosRecaudo.toFixed(2)}</div>
    <div class="result-item">Ahorro banda: $${ahorroBanda.toFixed(2)}</div>
    <div class="result-item">Ingreso neto disponible: $${ingresoFinal.toFixed(2)}</div>
    <div class="result-item"><strong>Honorario por músico: $${honorario.toFixed(2)}</strong></div>
  `;
  document.getElementById('output').innerHTML = salida;
  document.getElementById('resultados').style.display = 'block';

  // Envío por correo
  if (email) {
    const informe = {
      totalRecaudado, vendidas, ingresoEsperado, diferencia,
      costoUnitario, gastoManillas, sala, comisionDatafono,
      gastosTotales, honorariosRecaudo, ahorroBanda,
      ingresoFinal, honorario, email
    };
    fetch('https://julianguacaneme.com/calculadora-evento/enviar_informe.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(informe)
    })
    .then(res => res.json())
    .then(data => {
      alert(data.success
        ? `Informe enviado a ${email}` 
        : `Error al enviar: ${data.error}`);
    })
    .catch(() => {
      alert('Error de conexión al enviar informe');
    });
  }
}