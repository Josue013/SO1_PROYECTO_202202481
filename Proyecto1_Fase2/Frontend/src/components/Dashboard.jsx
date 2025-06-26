import React, { useEffect, useState, useRef } from "react";
import { Pie } from "react-chartjs-2";
import * as ChartJS from "chart.js";
import { connectToRealTimeMetrics, disconnectRealTimeMetrics } from "../utils/generadorDatos";
import gsap from "gsap";
import "../styles/Dashboard.css";

// Registrar componentes necesarios
ChartJS.Chart.register(ChartJS.ArcElement, ChartJS.Tooltip, ChartJS.Legend);

const Dashboard = () => {
  const [cpuUso, setCpuUso] = useState(0);
  const [ramUso, setRamUso] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const chartContainerRefs = useRef([]);
  const percentageRefs = useRef([]);
  const dashboardRef = useRef(null);
  const [ramDetails, setRamDetails] = useState({ total: 0, used: 0, free: 0 });
  const [processData, setProcessData] = useState({
    total_procesos: 0,
    procesos_corriendo: 0,
    procesos_durmiendo: 0,
    procesos_zombies: 0,
    procesos_parados: 0
  });

  const [cpuData, setCpuData] = useState({
    labels: ["En uso", "Sin Usar"],
    datasets: [
      {
        data: [0, 100],
        backgroundColor: ["#FF6384", "#36A2EB"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  });

  const [ramData, setRamData] = useState({
    labels: ["En uso", "Sin Usar"],
    datasets: [
      {
        data: [0, 100],
        backgroundColor: ["#FFCE56", "#4BC0C0"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  });

  // Animación de entrada suave
  useEffect(() => {
    gsap.fromTo(
      dashboardRef.current,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)" }
    );

    gsap.fromTo(
      chartContainerRefs.current,
      { y: 100, opacity: 0, rotationY: 45 },
      {
        y: 0,
        opacity: 1,
        rotationY: 0,
        duration: 1.2,
        stagger: 0.3,
        ease: "power3.out",
        delay: 0.5,
      }
    );
  }, []);

  // Conectar a Socket.io al montar el componente
  useEffect(() => {
    const handleMetricsUpdate = (data) => {
      console.log('🔄 Actualizando dashboard con datos:', data);
      
      const newCpuUso = Math.round(data.cpu);
      const newRamUso = Math.round(data.ram);

      setCpuUso(newCpuUso);
      setRamUso(newRamUso);
      setRamDetails(data.ram_details);
      setProcessData(data.processes);
      setLastUpdate(new Date().toLocaleTimeString());
      setIsConnected(true);

      // Actualizar gráficas
      setCpuData((prev) => ({
        ...prev,
        datasets: [
          {
            ...prev.datasets[0],
            data: [newCpuUso, 100 - newCpuUso],
          },
        ],
      }));

      setRamData((prev) => ({
        ...prev,
        datasets: [
          {
            ...prev.datasets[0],
            data: [newRamUso, 100 - newRamUso],
          },
        ],
      }));

      // Alertas críticas
      if (percentageRefs.current[0]) {
        alertaCritica(percentageRefs.current[0], newCpuUso);
      }
      if (percentageRefs.current[1]) {
        alertaCritica(percentageRefs.current[1], newRamUso);
      }
    };

    const socket = connectToRealTimeMetrics(handleMetricsUpdate);

    // Cleanup al desmontar
    return () => {
      disconnectRealTimeMetrics();
    };
  }, []);

  // Solo alerta cuando está crítico (>75%)
  const alertaCritica = (element, valor) => {
    const container = element.closest(".chart-container");

    if (valor > 75) {
      gsap.to(container, {
        boxShadow: "0 0 30px rgba(255, 99, 132, 0.8)",
        duration: 0.8,
        yoyo: true,
        repeat: 2,
        ease: "power2.inOut",
      });
    } else {
      gsap.to(container, {
        boxShadow: "0 8px 32px rgba(75, 192, 192, 0.8)",
        duration: 0.5,
        ease: "power2.out",
      });
    }
  };

  const handleChartHover = (index) => {
    gsap.to(chartContainerRefs.current[index], {
      y: -5,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleChartLeave = (index) => {
    gsap.to(chartContainerRefs.current[index], {
      y: 0,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return context.label + ": " + context.parsed + "%";
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 800,
      easing: "easeOutQuart",
    },
  };

  return (
    <div className="dashboard" ref={dashboardRef}>
      {/* Indicador de conexión */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot"></span>
        <span>
          {isConnected ? `En vivo - ${lastUpdate}` : 'Desconectado'}
        </span>
      </div>

      <div className="charts-row">
        <div
          className="chart-container"
          ref={(el) => (chartContainerRefs.current[0] = el)}
          onMouseEnter={() => handleChartHover(0)}
          onMouseLeave={() => handleChartLeave(0)}
        >
          <h3>Métricas CPU</h3>
          <div className="chart-content">
            <div className="chart-wrapper">
              <Pie key="cpu-chart" data={cpuData} options={options} />
            </div>
            <div className="chart-stats">
              <div className="stat-item">
                <div className="color-box cpu-used"></div>
                <div className="stat-text">
                  <span>En uso</span>
                  <span
                    className="percentage"
                    ref={(el) => (percentageRefs.current[0] = el)}
                  >
                    {cpuUso}%
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <div className="color-box cpu-free"></div>
                <div className="stat-text">
                  <span>Sin Usar</span>
                  <span className="percentage">{100 - cpuUso}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="chart-container"
          ref={(el) => (chartContainerRefs.current[1] = el)}
          onMouseEnter={() => handleChartHover(1)}
          onMouseLeave={() => handleChartLeave(1)}
        >
          <h3>Métricas RAM</h3>
          <div className="chart-content">
            <div className="chart-wrapper chart-wrapper-ram">
              <Pie key="ram-chart" data={ramData} options={options} />
            </div>
            <div className="chart-stats">
              <div className="ram-stats-row">
                <div className="stat-item ram-stat">
                  <div className="color-box ram-used"></div>
                  <div className="stat-text">
                    <span>En uso</span>
                    <span
                      className="percentage"
                      ref={(el) => (percentageRefs.current[1] = el)}
                    >
                      {ramUso}%
                    </span>
                  </div>
                </div>
                <div className="stat-item ram-stat">
                  <div className="color-box ram-free"></div>
                  <div className="stat-text">
                    <span>Sin Usar</span>
                    <span className="percentage">{100 - ramUso}%</span>
                  </div>
                </div>
              </div>
              <div className="ram-details-compact">
                <div className="detail-compact">
                  <span className="detail-label-small">Total: </span>
                  <span className="detail-value-small">
                    {((ramDetails.total || 0) / 1024).toFixed(2)} GB
                  </span>
                </div>
                <div className="detail-compact">
                  <span className="detail-label-small">Libre: </span>
                  <span className="detail-value-small">
                    {((ramDetails.free || 0) / 1024).toFixed(2)} GB
                  </span>
                </div>
                <div className="detail-compact">
                  <span className="detail-label-small">Uso: </span>
                  <span className="detail-value-small">
                    {((ramDetails.used || 0) / 1024).toFixed(2)} GB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="chart-container"
          ref={(el) => (chartContainerRefs.current[2] = el)}
          onMouseEnter={() => handleChartHover(2)}
          onMouseLeave={() => handleChartLeave(2)}
        >
          <h3>Métricas de Procesos</h3>
          <div className="process-content">
            <div className="process-bar-item">
              <div className="process-label">
                <span>Total de procesos:</span>
                <span className="process-count">{processData.total_procesos}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill total" 
                  style={{ 
                    width: `${(processData.total_procesos / processData.total_procesos * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="process-bar-item">
              <div className="process-label">
                <span>Procesos corriendo:</span>
                <span className="process-count">{processData.procesos_corriendo}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill running" 
                  style={{ 
                    width: `${(processData.procesos_corriendo / processData.total_procesos * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="process-bar-item">
              <div className="process-label">
                <span>Procesos durmiendo:</span>
                <span className="process-count">{processData.procesos_durmiendo}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill sleeping" 
                  style={{ 
                    width: `${(processData.procesos_durmiendo / processData.total_procesos * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="process-bar-item">
              <div className="process-label">
                <span>Procesos zombie:</span>
                <span className="process-count">{processData.procesos_zombies}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill zombie" 
                  style={{ 
                    width: `${(processData.procesos_zombies / processData.total_procesos * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="process-bar-item">
              <div className="process-label">
                <span>Procesos parados:</span>
                <span className="process-count">{processData.procesos_parados}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill stopped" 
                  style={{ 
                    width: `${(processData.procesos_parados / processData.total_procesos * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;