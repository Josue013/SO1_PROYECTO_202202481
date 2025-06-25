const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Database connection usando .env
const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
};

const pool = mysql.createPool(DB_CONFIG);

// Endpoint de salud
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "nodejs-api-1",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para recibir métricas del sistema
app.post("/metrics", async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({ error: "No data provided" });
    }

    console.log(`🟢 [NODE API 1] Datos recibidos: ${Array.isArray(data) ? data.length : 1} registros`);

    // Process data
    if (Array.isArray(data)) {
      let insertedCount = 0;
      for (const record of data) {
        if (await insertSystemMetrics(record)) {
          insertedCount++;
        }
      }

      console.log(`✅ [NODE API 1] Insertados ${insertedCount}/${data.length} registros`);
      res.json({
        message: `Processed ${data.length} records`,
        inserted: insertedCount,
        api: "nodejs-api-1",
      });
    } else {
      if (await insertSystemMetrics(data)) {
        console.log("✅ [NODE API 1] Registro insertado exitosamente");
        res.json({
          message: "Record inserted successfully",
          api: "nodejs-api-1",
        });
      } else {
        res.status(500).json({ error: "Failed to insert record" });
      }
    }
  } catch (error) {
    console.error("❌ [NODE API 1] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Function to insert system metrics
async function insertSystemMetrics(data) {
  try {
    const connection = await pool.getConnection();

    // Extraer datos según el formato del JSON actualizado
    const ramTotal = data.total_ram || 0;
    const ramFree = data.ram_libre || 0;
    const ramUsed = data.uso_ram || 0;
    const ramPercentage = data.porcentaje_ram || 0;
    const cpuUsage = data.porcentaje_cpu_uso || 0;
    const cpuFree = data.porcentaje_cpu_libre || 0;

    // Procesos
    const runningProcesses = data.procesos_corriendo || 0;
    const totalProcesses = data.total_procesos || 0;
    const sleepingProcesses = data.procesos_durmiendo || 0;
    const zombieProcesses = data.procesos_zombie || 0;
    const stoppedProcesses = data.procesos_parados || 0;

    const query = `
      INSERT INTO system_metrics 
      (ram_total, ram_free, ram_used, ram_percentage, cpu_usage, cpu_free,
       running_processes, total_processes, sleeping_processes, 
       zombie_processes, stopped_processes, data_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      ramTotal, ramFree, ramUsed, ramPercentage, cpuUsage, cpuFree,
      runningProcesses, totalProcesses, sleepingProcesses,
      zombieProcesses, stoppedProcesses, "nodejs_api1"
    ];

    await connection.execute(query, values);
    connection.release();

    console.log(`🟢 [NODE API 1] CPU: ${cpuUsage}%, RAM: ${ramPercentage}%, Procesos: ${totalProcesses}`);
    return true;
  } catch (error) {
    console.error("❌ [NODE API 1] Error insertando:", error);
    return false;
  }
}

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🟢 Node.js API 1 corriendo en puerto ${PORT}`);
  console.log(`🔗 Conectando a: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});