CREATE DATABASE IF NOT EXISTS conferences_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE conferences_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('аудитория','коворкинг','кинозал') NOT NULL
);

INSERT INTO rooms (name, type) VALUES
  ('Аудитория А-101', 'аудитория'),
  ('Аудитория Б-202', 'аудитория'),
  ('Коворкинг «Точка кипения»', 'коворкинг'),
  ('Коворкинг «Старт»', 'коворкинг'),
  ('Кинозал «Космос»', 'кинозал'),
  ('Кинозал «Премьер»', 'кинозал')
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  start_date DATETIME NOT NULL,
  payment_method ENUM('очное','СБП') NOT NULL,
  status ENUM('Новая','Мероприятие назначено','Завершено') DEFAULT 'Новая',
  review TEXT NULL,
  review_rating TINYINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Пароль админа обновим через seed-admin.js
INSERT INTO users (login, password_hash, full_name, phone, email, role)
VALUES (
  'Conf2027', 
  '$2b$10$UYsCiG4sl8vQMWT/ffZ5tO1FkK1otdNQBHvglJTHnbpz7UjI8kn6a',
  'Администратор портала', '8(900)000-00-00', 'admin@conf.rf', 'admin'
) ON DUPLICATE KEY UPDATE login = login;
