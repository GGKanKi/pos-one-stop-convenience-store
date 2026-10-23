CREATE TABLE IF NOT EXISTS inventory_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type ENUM('add', 'update') NOT NULL,
    product_id INT NULL,
    requested_by INT NOT NULL,
    before_data JSON NULL,
    requested_data JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    INDEX idx_inventory_change_status (status, created_at),
    CONSTRAINT fk_inventory_change_requester FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_inventory_change_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
