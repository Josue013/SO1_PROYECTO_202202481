CREATE DATABASE IF NOT EXISTS sopes1_db;

USE sopes1_db;

CREATE TABLE IF NOT EXISTS system_metrics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ram_total BIGINT,
          ram_free BIGINT,
          ram_used BIGINT,
          ram_percentage FLOAT,
          cpu_usage FLOAT,
          cpu_free FLOAT,
          running_processes INT,
          total_processes INT,
          sleeping_processes INT,
          zombie_processes INT,
          stopped_processes INT,
          data_source VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- truncate para limpiar tabla
-- TRUNCATE TABLE system_metrics;

