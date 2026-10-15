<?php
// backend/helpers/response.php

/**
 * Standardized JSON response handler
 */
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);
    exit;
}

/**
 * Helper to safely extract and decode incoming JSON payloads
 */
function getJsonInput() {
    $rawInput = file_get_contents("php://input");
    
    if (empty($rawInput)) {
        sendJsonResponse(false, "No input data provided.", null, 400);
    }

    $data = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(false, "Invalid JSON payload format.", null, 400);
    }

    return $data;
}
?>