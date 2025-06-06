<?php
// get_ratings.php
header('Content-Type: application/json; charset=utf-8');

// 1) Configura tus credenciales de MySQL (ajusta a tu entorno).
$host   = 'localhost';
$dbname = 'biscuit_landign';
$user   = 'root';
$pass   = '';
$dsn    = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

try {
    // 2) Conexión con PDO
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexión fallida: ' . $e->getMessage()]);
    exit;
}

try {
    // 3) Consulta que calcula promedio y conteos por rating
    $sql = "
        SELECT 
          ROUND(AVG(rating), 2) AS average_rating,
          COUNT(*) AS total_reviews,
          SUM(rating = 5) AS count_5,
          SUM(rating = 4) AS count_4,
          SUM(rating = 3) AS count_3,
          SUM(rating = 2) AS count_2,
          SUM(rating = 1) AS count_1
        FROM reviews;
    ";

    $stmt = $pdo->query($sql);
    $data = $stmt->fetch();

    // 4) Armar la respuesta en el mismo formato que espera el front-end
    $response = [
        'average_rating' => floatval($data['average_rating']) ?: 0.00,
        'total_reviews'  => intval($data['total_reviews']),
        'counts' => [
            5 => intval($data['count_5']),
            4 => intval($data['count_4']),
            3 => intval($data['count_3']),
            2 => intval($data['count_2']),
            1 => intval($data['count_1']),
        ]
    ];

    echo json_encode($response);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en consulta: ' . $e->getMessage()]);
    exit;
}
