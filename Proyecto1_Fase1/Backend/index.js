const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || "database",
    user: process.env.DB_USER || "so1_user",
    password: process.env.DB_PASSWORD || "so1_password",
    database: process.env.DB_NAME || "Proyecto1_Fase1",
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de conexiones
let pool;

// Función para inicializar la base de datos
async function initializeDatabase() {
    let retries = 10;
    
    while (retries > 0) {
        try {
            pool = mysql.createPool(dbConfig);
            console.log("Intentando conectar a MySQL...");
            
            // Probar la conexión
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
            
            console.log("✅ Base de datos funcionando correctamente");
            return;
        } catch (error) {
            console.error(`❌ Error conectando a la base de datos (intentos restantes: ${retries - 1}):`, error.message);
            retries--;
            
            if (retries === 0) {
                console.error("💀 No se pudo conectar a la base de datos después de 10 intentos");
                process.exit(1);
            }
            
            // Esperar 3 segundos antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

// Variables para almacenar los datos más recientes
let latestCpuData = { porcentaje: 0 };
let latestRamData = { total: 0, libre: 0, uso: 0, porcentaje: 0 };

// Ruta básica
app.get("/", (req, res) => {
    res.send("¡API Sistema de Monitoreo funcionando!");
});

// Endpoint para recibir datos de CPU desde Go
app.post("/cpu", async (req, res) => {
    try {
        const { porcentaje } = req.body;
        latestCpuData = { porcentaje: parseFloat(porcentaje) };

        // Insertar en la tabla cpu_info
        if (pool) {
            const query = "INSERT INTO cpu_info (usage_percentage) VALUES (?)";
            await pool.execute(query, [parseFloat(porcentaje)]);
        }

        console.log(`📊 CPU recibida: ${porcentaje}% - Guardada en BD`);
        res.send("¡CPU recibida y guardada!");
    } catch (error) {
        console.error("Error procesando CPU:", error);
        res.status(500).send("Error procesando CPU");
    }
});

// Endpoint para recibir datos de RAM desde Go
app.post("/ram", async (req, res) => {
    try {
        const { total, libre, uso, porcentaje } = req.body;
        latestRamData = {
            total: parseInt(total),
            libre: parseInt(libre),
            uso: parseInt(uso),
            porcentaje: parseFloat(porcentaje)
        };

        // Insertar en la tabla memory_info
        if (pool) {
            const query = `INSERT INTO memory_info 
                          (total_memory, free_memory, used_memory, memory_usage_percentage) 
                          VALUES (?, ?, ?, ?)`;
            await pool.execute(query, [
                parseInt(total),
                parseInt(libre),
                parseInt(uso),
                parseFloat(porcentaje)
            ]);
        }

        console.log(`💾 RAM recibida: ${porcentaje}% - Guardada en BD`);
        res.send("¡RAM recibida y guardada!");
    } catch (error) {
        console.error("Error procesando RAM:", error);
        res.status(500).send("Error procesando RAM");
    }
});

// Endpoint para que el frontend obtenga los datos
app.get("/api/metrics", (req, res) => {
    res.json({
        cpu: latestCpuData.porcentaje,
        ram: latestRamData.porcentaje,
        ram_details: {
            total: latestRamData.total,
            used: latestRamData.uso,
            free: latestRamData.libre
        }
    });
});

// Endpoint para obtener historial de CPU
app.get("/api/cpu-history", async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: "Base de datos no disponible" });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const query = "SELECT * FROM cpu_info ORDER BY created_at DESC LIMIT ?";
        const [rows] = await pool.execute(query, [limit]);
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo historial CPU:", error);
        res.status(500).json({ error: "Error obteniendo historial CPU" });
    }
});

// Endpoint para obtener historial de RAM
app.get("/api/ram-history", async (req, res) => {
    try {
        if (!pool) {
            return res.status(500).json({ error: "Base de datos no disponible" });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const query = "SELECT * FROM memory_info ORDER BY created_at DESC LIMIT ?";
        const [rows] = await pool.execute(query, [limit]);
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo historial RAM:", error);
        res.status(500).json({ error: "Error obteniendo historial RAM" });
    }
});

// Inicializar base de datos y servidor
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}

startServer();