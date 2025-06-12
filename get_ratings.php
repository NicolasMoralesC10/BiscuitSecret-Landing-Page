<?php
// get_ratings.php
header('Content-Type: application/json; charset=utf-8');

// 1) Configura tus credenciales de MySQL (corregido el typo en dbname)
$host   = 'localhost';
$dbname = 'u810917883_biscuit'; 
$user   = 'u810917883_secret';
$pass   = '7j[AgIb7IBD';
$dsn    = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

try {
    // 2) Conexión con PDO
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la base de datos']);
    exit;
}

try {
    // 3) Consulta principal: promedios por categoría y general
    $sql = "
        SELECT 
            ROUND(AVG(sabor), 1) AS average_sabor,
            ROUND(AVG(servicio), 1) AS average_servicio,
            ROUND(AVG(precio), 1) AS average_precio,
            ROUND((AVG(sabor) + AVG(servicio) + AVG(precio)) / 3, 1) AS average_general,
            COUNT(*) AS total_reviews,
            MIN(created_at) AS first_review_date,
            MAX(created_at) AS last_review_date
        FROM ratings
    ";

    $stmt = $pdo->query($sql);
    $averages = $stmt->fetch();

    // 4) Consulta adicional: distribución de calificaciones por categoría
    $distribution_sql = "
        SELECT 
            'sabor' as category,
            SUM(sabor = 5) AS count_5,
            SUM(sabor = 4) AS count_4,
            SUM(sabor = 3) AS count_3,
            SUM(sabor = 2) AS count_2,
            SUM(sabor = 1) AS count_1
        FROM ratings
        UNION ALL
        SELECT 
            'servicio' as category,
            SUM(servicio = 5) AS count_5,
            SUM(servicio = 4) AS count_4,
            SUM(servicio = 3) AS count_3,
            SUM(servicio = 2) AS count_2,
            SUM(servicio = 1) AS count_1
        FROM ratings
        UNION ALL
        SELECT 
            'precio' as category,
            SUM(precio = 5) AS count_5,
            SUM(precio = 4) AS count_4,
            SUM(precio = 3) AS count_3,
            SUM(precio = 2) AS count_2,
            SUM(precio = 1) AS count_1
        FROM ratings
    ";

    $distribution_stmt = $pdo->query($distribution_sql);
    $distributions = $distribution_stmt->fetchAll();

    // 5) Organizar distribuciones por categoría
    $category_distributions = [];
    foreach ($distributions as $dist) {
        $category_distributions[$dist['category']] = [
            5 => intval($dist['count_5']),
            4 => intval($dist['count_4']),
            3 => intval($dist['count_3']),
            2 => intval($dist['count_2']),
            1 => intval($dist['count_1'])
        ];
    }

    // 6) Consulta para estadísticas adicionales (opcional)
    $stats_sql = "
        SELECT 
            COUNT(DISTINCT DATE(created_at)) AS days_with_reviews,
            COUNT(DISTINCT ip_address) AS unique_users,
            AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) AS avg_age_seconds
        FROM ratings
        WHERE created_at IS NOT NULL
    ";

    $stats_stmt = $pdo->query($stats_sql);
    $additional_stats = $stats_stmt->fetch();

    // 7) Armar la respuesta completa
    $response = [
        // Promedios principales (lo que espera el JavaScript)
        'average_general' => floatval($averages['average_general']) ?: 0.0,
        'average_sabor' => floatval($averages['average_sabor']) ?: 0.0,
        'average_servicio' => floatval($averages['average_servicio']) ?: 0.0,
        'average_precio' => floatval($averages['average_precio']) ?: 0.0,
        'total_reviews' => intval($averages['total_reviews']),
        
        // Información adicional de fechas
        'first_review_date' => $averages['first_review_date'],
        'last_review_date' => $averages['last_review_date'],
        
        // Distribuciones por categoría (opcional para gráficos)
        'distributions' => $category_distributions,
        
        // Estadísticas adicionales (opcional)
        'statistics' => [
            'days_with_reviews' => intval($additional_stats['days_with_reviews']) ?: 0,
            'unique_users' => intval($additional_stats['unique_users']) ?: 0,
            'avg_review_age_hours' => round(floatval($additional_stats['avg_age_seconds']) / 3600, 1)
        ],
        
        // Metadatos
        'generated_at' => date('Y-m-d H:i:s'),
        'version' => '2.0'
    ];

    echo json_encode($response);
    exit;

} catch (PDOException $e) {
    // Log del error para debugging
    error_log("Error en get_ratings.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Error al obtener las calificaciones',
        'average_general' => 0.0,
        'average_sabor' => 0.0,
        'average_servicio' => 0.0,
        'average_precio' => 0.0,
        'total_reviews' => 0
    ]);
    exit;
}
?>