## 📊 Calculadora de Finanzas para Eventos – Mambo Candela

Esta herramienta web permite calcular y organizar los ingresos, gastos y honorarios de músicos para las presentaciones en vivo de la banda **Mambo Candela**. Es una aplicación 100% del lado del cliente (frontend) diseñada para ser fácil de usar, ofrecer un informe detallado y funcionar sin necesidad de un backend.

---

### 🧭 Paneles

La app tiene dos paneles, cada uno con su propia dirección. Comparten datos por `localStorage`, así que deben usarse en el **mismo navegador y dispositivo**.

| Panel | Dirección | Para qué |
|---|---|---|
| **Finanzas** | `/` | Calculadora, historial de eventos y configuración (liquidación). |
| **Taquilla** | `/taquilla/` | Registro en la puerta: personas que entran y su medio de pago. |

Al abrir el Panel de Finanzas, los datos de taquilla prellenan manillas vendidas, precio del cover, Nequi y Daviplata. El efectivo y el datáfono quedan como referencia y el informe incluye un **Cuadre con Taquilla** (diferencia de efectivo y comisión del datáfono). Al terminar un evento, usar **Iniciar nuevo evento** en el Panel de Taquilla.

---

### ✨ Características

*   Ingreso por múltiples métodos de pago: Nequi, Daviplata, Datáfono, Efectivo.
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
calculadora-evento/
├── index.html             # Interfaz principal de la calculadora
├── styles.css             # Estilos personalizados
├── script.js              # Lógica de la calculadora y cálculos
├── storage.js             # Manejo del almacenamiento local (historial, config y taquilla)
├── taquilla/              # Panel de Taquilla (index.html, taquilla.js, taquilla.css)
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
