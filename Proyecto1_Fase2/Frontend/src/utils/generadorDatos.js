const API_URL = 'http://localhost:3000';

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
    // Fallback a datos por defecto si hay error
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