-- Run: php backend/config/migrate.php

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `clock_in` DATETIME NOT NULL,
  `clock_out` DATETIME DEFAULT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `date` (`date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) 
