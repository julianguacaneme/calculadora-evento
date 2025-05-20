## 📊 Calculadora de Finanzas para Eventos – Mambo Candela

Esta herramienta web permite calcular y organizar los ingresos, gastos y honorarios de músicos para presentaciones en vivo de la banda **Mambo Candela**. Está diseñada para ser fácil de usar y ofrece un informe detallado con posibilidad de envío por correo electrónico.

---

### ✨ Características

* Ingreso por múltiples métodos de pago: Nequi, Daviplata, Datáfono, Efectivo.
* Control de manillas vendidas vs. ingresos.
* Cálculo automático de:

  * Costos fijos (sala de ensayo, manillas, caja chica).
  * Comisiones (datáfono, recaudador).
  * Ahorro para fondo de banda.
  * Repartición de honorarios por músico.
* Envío automático del informe por correo electrónico.
* Interfaz limpia, responsiva y lista para embeber en WordPress.

---

### 📟 Tecnologías usadas

* HTML5
* CSS3
* JavaScript
* PHP (para envío de correos con PHPMailer)
* PHPMailer
* SMTP Gmail

---

### 🚀 Cómo usar

1. Clona el repositorio:

   ```bash
   git clone https://github.com/julianguacaneme/calculadora-evento.git
   cd calculadora-evento
   ```

2. Sube los archivos a tu servidor web o al cPanel en la carpeta `/public_html/calculadora-evento`.

3. Asegúrate de tener habilitado PHPMailer en el servidor. Si usas Gmail:

   * Habilita **"acceso de apps menos seguras"** o usa una app password con 2FA.

4. Abre `index.html` en tu navegador o embébelo en tu WordPress mediante un `<iframe>` o como HTML personalizado.

---

### 📁 Estructura del proyecto

```
calculadora-evento/
├── index.html               # Interfaz principal
├── style.css                # Estilos personalizados
├── script.js                # Lógica de la calculadora
├── enviar_informe.php       # Envío de resultados por correo
├── README.md                # Este archivo
```

---

### 📧 Configurar envío de correos

* Edita `enviar_informe.php` con tus credenciales de Gmail.
* Usa una contraseña de aplicación si tienes autenticación en dos pasos.

---

### 💡 Créditos

Desarrollado por [Julián Guacaneme](https://julianguacaneme.com) para Mambo Candela.
