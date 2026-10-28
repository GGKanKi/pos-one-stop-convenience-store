CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  opening_amount DECIMAL(10,2) NOT NULL,
  closing_amount DECIMAL(10,2) NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  INDEX idx_cash_register_sessions_opened_at (opened_at),
  INDEX idx_cash_register_sessions_user_open (user_id, closed_at),
  CONSTRAINT fk_cash_register_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE transactions
  ADD COLUMN cash_register_session_id BIGINT UNSIGNED NULL AFTER status,
  ADD INDEX idx_transactions_register_session (cash_register_session_id),
  ADD CONSTRAINT fk_transactions_register_session FOREIGN KEY (cash_register_session_id) REFERENCES cash_register_sessions(id) ON DELETE SET NULL;
