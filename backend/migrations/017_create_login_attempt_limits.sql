CREATE TABLE IF NOT EXISTS login_attempt_limits (
    email_key CHAR(64) NOT NULL,
    ip_key CHAR(64) NOT NULL,
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    locked_until DATETIME NULL,
    PRIMARY KEY (email_key, ip_key),
    INDEX idx_login_attempt_limits_locked_until (locked_until),
    INDEX idx_login_attempt_limits_window_started (window_started_at)
);
