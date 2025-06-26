const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configurar Socket.io con CORS para Cloud Run
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://sopes1-frontend-realtime-82477752106.us-east4.run.app", // Permitir Cloud Run
      /^https:\/\/.*\.run\.app$/ // Regex para cualquier Cloud Run URL
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middlewares
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sopes1-frontend-realtime-82477752106.us-east4.run.app",
    /^https:\/\/.*\.run\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// Configuración de la BD
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para obtener la última métrica
async function getLatestMetric() {
  try {
    const connection = await pool.getConnection();
    
    const [rows] = await connection.execute(`
      SELECT 
        ram_total,
        ram_free, 
        ram_used,
        ram_percentage,
        cpu_usage,
        cpu_free,
        running_processes,
        total_processes,
        sleeping_processes,
        zombie_processes,
        stopped_processes,
        data_source,
        created_at
      FROM system_metrics 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    connection.release();
    
    if (rows.length > 0) {
      const metric = rows[0];
      
      // Formatear datos para el frontend
      return {
        cpu: parseFloat(metric.cpu_usage) || 0,
        ram: parseFloat(metric.ram_percentage) || 0,
        ram_details: {
          total: parseInt(metric.ram_total) || 0,
          used: parseInt(metric.ram_used) || 0,
          free: parseInt(metric.ram_free) || 0
        },
        processes: {
          total_procesos: parseInt(metric.total_processes) || 0,
          procesos_corriendo: parseInt(metric.running_processes) || 0,
          procesos_durmiendo: parseInt(metric.sleeping_processes) || 0,
          procesos_zombies: parseInt(metric.zombie_processes) || 0,
          procesos_parados: parseInt(metric.stopped_processes) || 0
        },
        data_source: metric.data_source,
        timestamp: metric.created_at
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo métricas de BD:', error);
    return null;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);
  
  // Enviar datos inmediatamente al conectar
  getLatestMetric().then(data => {
    if (data) {
      socket.emit('metrics_update', data);
      console.log('📊 Datos iniciales enviados a:', socket.id);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// Enviar actualizaciones cada 2 segundos a todos los clientes conectados
setInterval(async () => {
  const latestData = await getLatestMetric();
  if (latestData) {
    io.emit('metrics_update', latestData);
    console.log('📡 Broadcasting datos a todos los clientes');
  }
}, 2000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nodejs-realtime-api',
    api: 'nodejs-api-2',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

// API endpoint para obtener datos (backup)
app.get('/api/metrics/latest', async (req, res) => {
  try {
    const data = await getLatestMetric();
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: 'No hay datos disponibles' });
    }
  } catch (error) {
    console.error('Error en /api/metrics/latest:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Socket.io API corriendo en puerto:', PORT);
  console.log('📡 WebSocket endpoint: ws://0.0.0.0:' + PORT);
  console.log('🌐 CORS permitido para Cloud Run');
});