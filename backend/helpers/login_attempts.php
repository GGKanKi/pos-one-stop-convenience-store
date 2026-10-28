<?php

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;
const LOGIN_ATTEMPT_LOCK_MINUTES = 15;

function getLoginAttemptKeys(string $email): array
{
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return [hash('sha256', strtolower(trim($email))), hash('sha256', $ipAddress)];
}

function getLoginLockSeconds(PDO $pdo, string $emailKey, string $ipKey): int
{
    $stmt = $pdo->prepare('SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), locked_until)) FROM login_attempt_limits WHERE email_key = ? AND ip_key = ? AND locked_until > NOW() LIMIT 1');
    $stmt->execute([$emailKey, $ipKey]);
    return (int)($stmt->fetchColumn() ?: 0);
}

function recordFailedLogin(PDO $pdo, string $emailKey, string $ipKey): int
{
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM login_attempt_limits WHERE window_started_at < DATE_SUB(NOW(), INTERVAL 1 DAY) AND (locked_until IS NULL OR locked_until <= NOW())');
        $insert = $pdo->prepare('INSERT IGNORE INTO login_attempt_limits (email_key, ip_key, failed_attempts, window_started_at) VALUES (?, ?, 0, NOW())');
        $insert->execute([$emailKey, $ipKey]);

        $select = $pdo->prepare('SELECT failed_attempts, window_started_at <= DATE_SUB(NOW(), INTERVAL ' . LOGIN_ATTEMPT_WINDOW_MINUTES . ' MINUTE) AS window_expired FROM login_attempt_limits WHERE email_key = ? AND ip_key = ? FOR UPDATE');
        $select->execute([$emailKey, $ipKey]);
        $record = $select->fetch(PDO::FETCH_ASSOC);

        $attempts = (int)$record['window_expired'] ? 1 : ((int)$record['failed_attempts'] + 1);
        $update = $pdo->prepare('UPDATE login_attempt_limits SET failed_attempts = ?, window_started_at = IF(? = 1, NOW(), window_started_at), locked_until = IF(? >= ' . LOGIN_ATTEMPT_LIMIT . ', DATE_ADD(NOW(), INTERVAL ' . LOGIN_ATTEMPT_LOCK_MINUTES . ' MINUTE), NULL) WHERE email_key = ? AND ip_key = ?');
        $update->execute([$attempts, (int)$record['window_expired'], $attempts, $emailKey, $ipKey]);
        $pdo->commit();
        return $attempts;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function clearLoginAttempts(PDO $pdo, string $emailKey, string $ipKey): void
{
    $stmt = $pdo->prepare('DELETE FROM login_attempt_limits WHERE email_key = ? AND ip_key = ?');
    $stmt->execute([$emailKey, $ipKey]);
}
