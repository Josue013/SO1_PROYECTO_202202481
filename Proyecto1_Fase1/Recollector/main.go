package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// Struct para los datos del cpu
type CpuData struct {
	Porcentaje float64 `json:"porcentaje"`
}

// Struct para los datos de la ram
type RamData struct {
	Total      int64   `json:"total"`
	Libre      int64   `json:"libre"`
	Uso        int64   `json:"uso"`
	Porcentaje float64 `json:"porcentaje"`
}

// Struct para enviar a la API
type SystemData struct {
    Timestamp string  `json:"timestamp"`
    CpuUsage  float64 `json:"cpu_usage"`
    RamData   RamData `json:"ram_data"`
}

// Función para leer datos del módulo CPU
func getCpuData() (CpuData, error) {
    var cpuData CpuData
    
    cmd := exec.Command("sh", "-c", "cat /proc/cpu_202202481")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return cpuData, fmt.Errorf("error leyendo CPU: %v", err)
    }

    err = json.Unmarshal(output, &cpuData)
    if err != nil {
        return cpuData, fmt.Errorf("error parseando JSON CPU: %v", err)
    }

    return cpuData, nil
}

// Función para leer datos del módulo RAM
func getRamData() (RamData, error) {
    var ramData RamData
    
    cmd := exec.Command("sh", "-c", "cat /proc/ram_202202481")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return ramData, fmt.Errorf("error leyendo RAM: %v", err)
    }

    err = json.Unmarshal(output, &ramData)
    if err != nil {
        return ramData, fmt.Errorf("error parseando JSON RAM: %v", err)
    }

    return ramData, nil
}

// Función que recolecta y envíar datos cada segundo
func dataCollector() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            fmt.Println("🔄 Recolectando datos del sistema...")

            // Obtener datos de CPU
            cpuData, err := getCpuData()
            if err != nil {
                fmt.Printf("❌ Error obteniendo datos CPU: %v\n", err)
                continue
            }

            // Obtener datos de RAM
            ramData, err := getRamData()
            if err != nil {
                fmt.Printf("❌ Error obteniendo datos RAM: %v\n", err)
                continue
            }

            // Crear estructura de datos del sistema
            systemData := SystemData{
                Timestamp: time.Now().Format("2006-01-02 15:04:05"),
                CpuUsage:  cpuData.Porcentaje,
                RamData:   ramData,
            }

            // Mostrar datos en consola
            fmt.Printf("📊 CPU: %.1f%% | RAM: %dMB/%dMB (%.1f%%)\n", 
                systemData.CpuUsage, 
                ramData.Uso, 
                ramData.Total, 
                float64(ramData.Porcentaje))

            // Enviar datos de CPU
            cpuJsonData, _ := json.Marshal(cpuData)
            resp, err := http.Post("http://localhost:3000/cpu", "application/json", bytes.NewBuffer(cpuJsonData))
            if err != nil {
                fmt.Printf("❌ Error enviando CPU: %v\n", err)
            } else {
                resp.Body.Close()
                fmt.Printf("✅ CPU enviada: %.1f%%\n", cpuData.Porcentaje)
            }

            // Enviar datos de RAM
            ramJsonData, _ := json.Marshal(ramData)
            resp, err = http.Post("http://localhost:3000/ram", "application/json", bytes.NewBuffer(ramJsonData))
            if err != nil {
                fmt.Printf("❌ Error enviando RAM: %v\n", err)
            } else {
                resp.Body.Close()
                fmt.Printf("✅ RAM enviada: %.1f%%\n", ramData.Porcentaje)
            }

            fmt.Println("════════════════════════════════════════════════")
        }
    }
}

// Endpoints de Fiber
func setupRoutes(app *fiber.App) {

    // Endpoint de prueba
    app.Get("/", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "message": "Sistema de Monitoreo - Proyecto SO1",
            "status":  "running",
            "time":    time.Now().Format("2006-01-02 15:04:05"),
        })
    })

    // Endpoint para obtener datos actuales de CPU
    app.Get("/cpu", func(c *fiber.Ctx) error {
        cpuData, err := getCpuData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        return c.JSON(cpuData)
    })

    // Endpoint para obtener datos actuales de RAM
    app.Get("/ram", func(c *fiber.Ctx) error {
        ramData, err := getRamData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        return c.JSON(ramData)
    })

    // Endpoint para obtener todos los datos del sistema
    app.Get("/system", func(c *fiber.Ctx) error {
        cpuData, err := getCpuData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": "Error obteniendo CPU: " + err.Error(),
            })
        }

        ramData, err := getRamData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{
                "error": "Error obteniendo RAM: " + err.Error(),
            })
        }

        systemData := SystemData{
            Timestamp: time.Now().Format("2006-01-02 15:04:05"),
            CpuUsage:  cpuData.Porcentaje,
            RamData:   ramData,
        }

        return c.JSON(systemData)
    })
}

func main() {
    fmt.Println("🚀 Iniciando Sistema de Monitoreo - SO1 Proyecto Fase 1")
    fmt.Println("📡 Recolector de métricas del sistema")

    // Crear aplicación Fiber
    app := fiber.New(fiber.Config{
        AppName: "Sistema Monitoreo SO1",
    })

    // Middleware CORS
    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowMethods: "GET,POST,PUT,DELETE",
        AllowHeaders: "Origin,Content-Type,Accept,Authorization",
    }))

    // Configurar rutas
    setupRoutes(app)

    // Iniciar recolector de datos en goroutine
    go dataCollector()

    // Iniciar servidor
    fmt.Println("🌐 Servidor iniciado en puerto 5200")
    fmt.Println("📊 Endpoints disponibles:")
    fmt.Println("   GET /        - Estado del sistema")
    fmt.Println("   GET /cpu     - Datos de CPU")
    fmt.Println("   GET /ram     - Datos de RAM")
    fmt.Println("   GET /system  - Datos completos del sistema")
    
    log.Fatal(app.Listen(":5200"))
}
