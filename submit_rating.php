<?php
// submit_rating.php
header('Content-Type: application/json; charset=utf-8');

// 1) Solo aceptamos JSON por POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Método no permitido. Solo se acepta POST.'
    ]);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

// Verificar que se recibió JSON válido
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'JSON inválido recibido'
    ]);
    exit;
}

// 2) Validar que se recibieron las 3 categorías
$required_categories = ['sabor', 'servicio', 'precio'];
$ratings = [];

foreach ($required_categories as $category) {
    if (!isset($data[$category])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "No se recibió calificación para: {$category}"
        ]);
        exit;
    }
    
    $rating = intval($data[$category]);
    if ($rating < 1 || $rating > 5) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Calificación inválida para {$category}. Debe ser entre 1 y 5 (recibido: {$rating})"
        ]);
        exit;
    }
    
    $ratings[$category] = $rating;
}

// 3) Obtener información adicional para auditoría
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

// Limpiar IP si viene con proxy
if ($ip_address && strpos($ip_address, ',') !== false) {
    $ip_address = trim(explode(',', $ip_address)[0]);
}

// También considerar headers de proxy comunes
$forwarded_ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? null;
if ($forwarded_ip) {
    $ip_address = trim(explode(',', $forwarded_ip)[0]);
}

// 4) Configuración de conexión a MySQL
$host   = 'localhost';
$dbname = 'u810917883_biscuit';
$user   = 'u810917883_secret';
$pass   = '7j[AgIb7IBD';
$dsn    = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false
    ]);
} catch (PDOException $e) {
    error_log("Error de conexión DB: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de conexión a la base de datos. Intenta nuevamente.'
    ]);
    exit;
}

try {
    // 5) Verificar si ya existe una calificación de esta IP recientemente
    $check_sql = "SELECT 
                    COUNT(*) as count,
                    MAX(created_at) as last_rating,
                    TIMESTAMPDIFF(MINUTE, MAX(created_at), NOW()) as minutes_ago
                  FROM ratings 
                  WHERE ip_address = :ip_address 
                  AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
    
    $check_stmt = $pdo->prepare($check_sql);
    $check_stmt->execute(['ip_address' => $ip_address]);
    $existing = $check_stmt->fetch();
    
    if ($existing['count'] > 0) {
        $minutes_remaining = 60 - intval($existing['minutes_ago']);
        
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Ya has enviado una calificación recientemente. Espera un poco antes de calificar nuevamente.',
            'details' => [
                'last_rating' => $existing['last_rating'],
                'minutes_ago' => intval($existing['minutes_ago']),
                'minutes_remaining' => max(0, $minutes_remaining),
                'can_rate_again_at' => date('Y-m-d H:i:s', strtotime($existing['last_rating'] . ' +1 hour'))
            ]
        ]);
        exit;
    }
    
    // 6) Insertar las calificaciones por categoría
    $sql = "INSERT INTO ratings (sabor, servicio, precio, ip_address, user_agent, created_at) 
            VALUES (:sabor, :servicio, :precio, :ip_address, :user_agent, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $success = $stmt->execute([
        'sabor' => $ratings['sabor'],
        'servicio' => $ratings['servicio'],
        'precio' => $ratings['precio'],
        'ip_address' => $ip_address,
        'user_agent' => $user_agent
    ]);
    
    if (!$success) {
        throw new PDOException("Error al insertar la calificación");
    }
    
    // 7) Obtener el ID de la calificación insertada
    $rating_id = $pdo->lastInsertId();
    
    // 8) Obtener estadísticas actualizadas
    $stats_sql = "SELECT 
                    ROUND(AVG(sabor), 1) as avg_sabor,
                    ROUND(AVG(servicio), 1) as avg_servicio,
                    ROUND(AVG(precio), 1) as avg_precio,
                    ROUND((AVG(sabor) + AVG(servicio) + AVG(precio)) / 3, 1) as avg_general,
                    COUNT(*) as total_reviews,
                    MIN(created_at) as first_review,
                    MAX(created_at) as last_review
                  FROM ratings";
    
    $stats_stmt = $pdo->query($stats_sql);
    $stats = $stats_stmt->fetch();
    
    // 9) Respuesta exitosa con estadísticas completas
    http_response_code(201); // Created
    echo json_encode([
        'success' => true,
        'message' => '¡Gracias por tu calificación! Tu opinión es muy importante para nosotros.',
        'rating_id' => intval($rating_id),
        'submitted_ratings' => $ratings,
        'submitted_at' => date('Y-m-d H:i:s'),
        'updated_stats' => [
            'average_sabor' => floatval($stats['avg_sabor'] ?? 0),
            'average_servicio' => floatval($stats['avg_servicio'] ?? 0),
            'average_precio' => floatval($stats['avg_precio'] ?? 0),
            'average_general' => floatval($stats['avg_general'] ?? 0),
            'total_reviews' => intval($stats['total_reviews'] ?? 0),
            'first_review' => $stats['first_review'],
            'last_review' => $stats['last_review']
        ],
        'next_rating_allowed_at' => date('Y-m-d H:i:s', strtotime('+1 hour'))
    ]);

} catch (PDOException $e) {
    // Log del error para debugging
    error_log("Error en submit_rating.php: " . $e->getMessage());
    error_log("SQL State: " . $e->getCode());
    error_log("Datos recibidos: " . json_encode($ratings));
    error_log("IP: " . $ip_address);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor. Por favor intenta nuevamente.',
        'timestamp' => date('Y-m-d H:i:s'),
        'error_code' => 'DB_ERROR_' . time()
    ]);
    exit;
    
} catch (Exception $e) {
    // Capturar cualquier otro error inesperado
    error_log("Error inesperado en submit_rating.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error inesperado. Por favor intenta nuevamente.',
        'timestamp' => date('Y-m-d H:i:s'),
        'error_code' => 'UNEXPECTED_ERROR_' . time()
    ]);
    exit;
}
?>