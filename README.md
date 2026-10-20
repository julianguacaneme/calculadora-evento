## 📊 Gestor de Eventos – Mambo Candela

Esta herramienta web reúne la taquilla y las finanzas de cada evento: permite registrar las entradas en la puerta y calcular y organizar los ingresos, gastos y honorarios de músicos para las presentaciones en vivo de la banda **Mambo Candela**. Es una aplicación 100% del lado del cliente (frontend) diseñada para ser fácil de usar, ofrecer un informe detallado y funcionar sin necesidad de un backend.

---

### 🧭 Paneles

La app tiene dos paneles, cada uno con su propia dirección. Comparten datos por `localStorage`, así que deben usarse en el **mismo navegador y dispositivo**.

| Panel | Dirección | Para qué |
|---|---|---|
| **Finanzas** | `/` | Calculadora, historial de eventos y configuración (liquidación). |
| **Taquilla** | `/taquilla/` | Registro en la puerta: personas que entran y su medio de pago. Pestaña **Preventa (QR)** para validar boletas. |
| **Preventa** | `/preventa/` | Venta de boletas con QR, datos de compradores, etapas de precio y beneficios. |
| **Boleta** | `/boleta/?c=CÓDIGO` | Página pública con el QR que recibe el comprador. |

Al abrir el Panel de Finanzas, los datos de taquilla prellenan manillas vendidas, precio del cover, Nequi, Daviplata y Bre-B. El efectivo y el datáfono quedan como referencia y el informe incluye un **Cuadre con Taquilla** (diferencia de efectivo y comisión del datáfono). Al terminar un evento, usar **Iniciar nuevo evento** en el Panel de Taquilla.

---

### 🎟️ Preventa de boletas

A diferencia de Finanzas y Taquilla, la preventa guarda sus datos **en el servidor** (`api/`, PHP + SQLite), porque se vende desde un celular y se valida desde otro.

1.  **Eventos** (Panel de Preventa): crea el evento con su cupo y sus etapas de venta (p. ej. *Early bird* $15.000 para los primeros 50 con coctel de bienvenida, *Preventa* $20.000). Cada etapa puede tener precio, cupo, fecha límite y beneficio.
2.  **Vender:** después de confirmar el pago (Nequi, Bre-B, Bold, etc.), registra los datos del comprador. Se genera un código único con QR y el botón **Enviar por WhatsApp** abre el chat con el link de la boleta.
3.  **Puerta:** en Taquilla → **Preventa (QR)**, con el PIN de la puerta, se escanea el QR con la cámara o se busca por nombre/cédula. Muestra si la boleta es válida, si ya ingresó o si fue anulada, permite dejar entrar a parte del grupo y marcar el beneficio entregado.
    *   **Sin señal:** la lista de boletas queda guardada en el celular; los ingresos se envían al servidor cuando vuelve la conexión. Abre la pestaña con internet antes de que empiece el evento.
    *   La cámara requiere `https` (en el sitio publicado funciona; en la red local por `http` no).

**Configuración (una sola vez):** crea en GitHub los secrets `PREVENTA_PIN_ADMIN` (Panel de Preventa) y `PREVENTA_PIN_PUERTA` (escáner). El deploy genera `api/config.php` con ellos. La base de datos se crea sola en `api/datos/` (protegida con `.htaccess`, nunca se sube a git). Hosting requerido: PHP 7.4+ con `pdo_sqlite`.

**Prueba local:** `php -S 127.0.0.1:8765` en la raíz, con un `api/config.php` copiado de `api/config.ejemplo.php`.

---

### ✨ Características

*   Ingreso por múltiples métodos de pago: Nequi, Daviplata, Llave Bre-B, Datáfono, Efectivo.
    *   El datáfono se ingresa como **valor neto recibido** (el que muestra la app del datáfono, ya con comisiones descontadas).
*   Control de manillas vendidas vs. ingresos (ingreso esperado por cover vs. ingreso real).
*   Cálculo automático de:
    *   Gastos operativos (sala de ensayo, manillas, utileros/rodies).
    *   Honorarios del recaudador.
    *   Ahorro para el fondo de la banda.
    *   Repartición de honorarios por músico.
*   **Almacenamiento local:** Guarda el historial de eventos y la configuración en el navegador.
*   **Exportación:** Permite descargar el informe en PDF, imprimirlo o compartirlo por WhatsApp.
*   **Envío de informe:** Opción para enviar el resumen usando el cliente de correo local del usuario.
*   Interfaz limpia, responsiva y lista para embeber en WordPress.

---

### 📟 Tecnologías Usadas

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   **jsPDF & html2canvas:** Para la generación de reportes en PDF.
*   **GitHub Actions:** Para el despliegue automático vía FTP.

---

### 🚀 Cómo Usar

**Opción 1: Uso Local**

1.  Clona o descarga este repositorio.
2.  Abre el archivo `index.html` directamente en tu navegador web.

**Opción 2: Despliegue**

El repositorio está configurado para desplegarse automáticamente vía FTPS cada vez que se realiza un `push` a la rama `master`, utilizando GitHub Actions. Requiere los secrets `FTP_HOST`, `FTP_USERNAME`, `FTP_PASSWORD` y `FTP_REMOTE_DIR`.

> Al cambiar `index.html`, `styles.css`, `script.js` o `storage.js`, incrementa el parámetro `?v=N` en `index.html` para evitar el caché de Cloudflare.

---

### 📁 Estructura del Proyecto

```
gestor-eventos/
├── index.html             # Interfaz principal de la calculadora
├── styles.css             # Estilos personalizados
├── script.js              # Lógica de la calculadora y cálculos
├── storage.js             # Manejo del almacenamiento local (historial, config y taquilla)
├── taquilla/              # Panel de Taquilla (index.html, taquilla.js, escaner.js, taquilla.css)
├── preventa/              # Panel de Preventa (venta de boletas)
├── boleta/                # Página pública de la boleta con QR
├── api/                   # API de preventa (PHP + SQLite); datos/ guarda la base
├── lib/                   # Cliente de la API y librerías de QR (qrcodejs, html5-qrcode)
│
├── .github/
│   └── workflows/
│       └── deploy.yml     # Flujo de trabajo para despliegue automático
│
└── README.md              # Este archivo
```

---

### 💡 Créditos

Desarrollado por [Julián Guacaneme](https://julianguacaneme.com) para Mambo Candela.
