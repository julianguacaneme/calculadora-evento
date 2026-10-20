<?php
// Copia de referencia. El deploy genera api/config.php con los secrets de GitHub
// PREVENTA_PIN_ADMIN y PREVENTA_PIN_PUERTA (ver README). Nunca subas config.php a git.
return [
    'pin_admin' => '123456',  // Panel de Preventa (vender, ver datos de compradores)
    'pin_puerta' => '0000',   // Escáner en Taquilla (solo validar ingresos)
];
