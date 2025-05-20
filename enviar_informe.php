<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email']) || empty($data['email'])) {
    echo json_encode(['success' => false, 'error' => 'No se proporcionó el correo electrónico']);
    exit;
}

$mail = new PHPMailer(true);

try {
    // Configuración del servidor SMTP de Gmail
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'mambocandelaensamble@gmail.com'; // TU CORREO
    $mail->Password   = 'bvlh doqq rsbh cdtw'; // CONTRASEÑA DE APLICACIÓN GMAIL
    $mail->SMTPSecure = 'tls';
    $mail->Port       = 587;

    // Remitente y destinatario
    $mail->setFrom('mambocandelaensamble@gmail.com', 'Mambo Candela');
    $mail->addAddress($data['email']);

    // Contenido del mensaje
    $mail->isHTML(true);
    $mail->Subject = 'Informe financiero - Presentación Mambo Candela';

    $mail->Body = "
      <h2>Informe Financiero del Evento</h2>
      <ul>
        <li><strong>Total recaudado:</strong> $" . number_format($data['totalRecaudado'], 2) . "</li>
        <li><strong>Manillas vendidas:</strong> " . $data['vendidas'] . "</li>
        <li><strong>Ingreso esperado por cover:</strong> $" . number_format($data['ingresoEsperado'], 2) . "</li>
        <li><strong>Diferencia entre ingreso y cover:</strong> $" . number_format($data['diferencia'], 2) . "</li>
        <li><strong>Costo unitario manilla:</strong> $" . number_format($data['costoUnitario'], 2) . "</li>
        <li><strong>Gasto en manillas:</strong> $" . number_format($data['gastoManillas'], 2) . "</li>
        <li><strong>Comisión datáfono:</strong> $" . number_format($data['comisionDatafono'], 2) . "</li>
        <li><strong>Gastos totales:</strong> $" . number_format($data['gastosTotales'], 2) . "</li>
        <li><strong>Honorarios persona que recauda:</strong> $" . number_format($data['honorariosRecaudo'], 2) . "</li>
        <li><strong>Ahorro banda:</strong> $" . number_format($data['ahorroBanda'], 2) . "</li>
        <li><strong>Ingreso neto disponible:</strong> $" . number_format($data['ingresoFinal'], 2) . "</li>
        <li><strong>Honorario por músico:</strong> $" . number_format($data['honorario'], 2) . "</li>
      </ul>
    ";

    $mail->send();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => "Error al enviar el correo: {$mail->ErrorInfo}"]);
}
