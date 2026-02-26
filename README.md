## 📊 Calculadora de Finanzas para Eventos – Mambo Candela

Esta herramienta web permite calcular y organizar los ingresos, gastos y honorarios de músicos para las presentaciones en vivo de la banda **Mambo Candela**. Es una aplicación 100% del lado del cliente (frontend) diseñada para ser fácil de usar, ofrecer un informe detallado y funcionar sin necesidad de un backend.

---

### ✨ Características

*   Ingreso por múltiples métodos de pago: Nequi, Daviplata, Datáfono, Efectivo.
*   Control de manillas vendidas vs. ingresos.
*   Cálculo automático de:
    *   Costos fijos (sala de ensayo, manillas, caja chica).
    *   Comisiones (datáfono, recaudador).
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
2.  Abre el archivo `legacy_v1/index.html` directamente en tu navegador web.

**Opción 2: Despliegue**

El repositorio está configurado para desplegarse automáticamente en un servidor FTP cada vez que se realiza un `push` a la rama `main`, utilizando GitHub Actions.

---

### 📁 Estructura del Proyecto

```
calculadora-evento/
├── legacy_v1/
│   ├── index.html         # Interfaz principal de la calculadora
│   ├── styles.css         # Estilos personalizados
│   ├── script.js          # Lógica de la calculadora y cálculos
│   └── storage.js         # Manejo del almacenamiento local (historial y config)
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
