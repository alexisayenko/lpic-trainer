-- Run once against your database (single-user; the API token gates access).
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS lpic CHARACTER SET utf8mb4;
USE lpic;

CREATE TABLE IF NOT EXISTS answers (
  id           CHAR(36)    NOT NULL,
  question_id  VARCHAR(64) NOT NULL,
  picked_index INT         NULL,
  correct      TINYINT(1)  NOT NULL,
  ts           BIGINT      NOT NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- A dedicated, least-privilege user for the API (change the password):
-- CREATE USER 'lpic'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON lpic.answers TO 'lpic'@'127.0.0.1';
-- FLUSH PRIVILEGES;
