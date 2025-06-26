import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000';
// Usar IP del nodo + puerto NodePort
const REALTIME_API_URL = 'http://104.197.132.251:30080'; // IP del nodo + nodePort

// Socket.io client
let socket = null;
let metricsCallback = null;

// Conectar a Socket.io
export const connectToRealTimeMetrics = (callback) => {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(REALTIME_API_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true
  });
  
  metricsCallback = callback;
  
  socket.on('connect', () => {
    console.log('🟢 Conectado a Socket.io server via nodePort');
  });
  
  socket.on('metrics_update', (data) => {
    console.log('📊 Datos recibidos via Socket.io:', data);
    if (metricsCallback) {
      metricsCallback(data);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Desconectado de Socket.io server');
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión Socket.io:', error);
  });
  
  return socket;
};

// Desconectar Socket.io
export const disconnectRealTimeMetrics = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    metricsCallback = null;
  }
};

// Función original (fallback)
export const obtenerMetricasSistema = async () => {
  try {
    const response = await fetch(`${API_URL}/api/metrics`);
    const data = await response.json();
    
    return {
      cpu: data.cpu || 0,
      ram: data.ram || 0,
      ram_details: data.ram_details || { total: 0, used: 0, free: 0 },
      processes: data.processes || {
        total_procesos: 0,
        procesos_corriendo: 0,
        procesos_durmiendo: 0,
        procesos_zombies: 0,
        procesos_parados: 0
      }
    };
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    return {
      cpu: 0,
      ram: 0,
      ram_details: { total: 0, used: 0, free: 0 },
      processes: {
        total_procesos: 0,
        procesos_corriendo: 0,
        procesos_durmiendo: 0,
        procesos_zombies: 0,
        procesos_parados: 0
      }
    };
  }
};