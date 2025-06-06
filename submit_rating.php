<?php
// submit_rating.php
header('Content-Type: application/json; charset=utf-8');

// 1) Solo aceptamos JSON por POST
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!isset($data['rating'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió rating']);
    exit;
}

$rating = intval($data['rating']);
if ($rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['error' => 'Rating inválido']);
    exit;
}

// 2) Configura tu conexión a MySQL (igual que en get_ratings.php)
$host   = 'localhost';
$dbname = 'biscuit_landign';
$user   = 'root';
$pass   = '';
$dsn    = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

try {
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
    // 3) Insertar solo la valoración (rating). Comment lo dejamos vacío.
    $sql = "INSERT INTO reviews (rating, comment) VALUES (:rating, '')";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['rating' => $rating]);

    echo json_encode(['success' => true]);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar rating: ' . $e->getMessage()]);
    exit;
}
