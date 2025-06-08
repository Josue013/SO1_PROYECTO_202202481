const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Variables para almacenar los datos más recientes
let latestCpuData = { porcentaje: 0 };
let latestRamData = { total: 0, libre: 0, uso: 0, porcentaje: 0 };

// Ruta básica
app.get('/', (req, res) => {
    res.send('¡API Sistema de Monitoreo funcionando!');
});

// Endpoint para recibir datos de CPU desde Go
app.post('/cpu', (req, res) => {
    try {
        const { porcentaje } = req.body;
        latestCpuData = { porcentaje: parseFloat(porcentaje) };
        console.log(`📊 CPU recibida: ${porcentaje}%`);
        res.send('¡CPU recibida!');
    } catch (error) {
        console.error('Error procesando CPU:', error);
        res.status(500).send('Error procesando CPU');
    }
});

// Endpoint para recibir datos de RAM desde Go
app.post('/ram', (req, res) => {
    try {
        const { total, libre, uso, porcentaje } = req.body;
        latestRamData = {
            total: parseInt(total),
            libre: parseInt(libre),
            uso: parseInt(uso),
            porcentaje: parseFloat(porcentaje)
        };
        console.log(`💾 RAM recibida: ${porcentaje}%`);
        res.send('¡RAM recibida!');
    } catch (error) {
        console.error('Error procesando RAM:', error);
        res.status(500).send('Error procesando RAM');
    }
});

// Endpoint para que el frontend obtenga los datos
app.get('/api/metrics', (req, res) => {
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});