<?php
$to = "tu-correo-personal@correo.com";
$subject = "Prueba de envío desde julianguacaneme.com";
$message = "Si ves este mensaje, el envío de correo está funcionando correctamente.";
$headers = "From: mambocandela@julianguacaneme.com";

if (mail($to, $subject, $message, $headers)) {
    echo "Correo enviado correctamente.";
} else {
    echo "Error al enviar correo.";
}
