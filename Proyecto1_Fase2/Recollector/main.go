package main

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
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

// Struct para los datos de procesos
type ProcessData struct {
    ProcesosCorriendo int `json:"procesos_corriendo"`
    TotalProcesos     int `json:"total_procesos"`
    ProcesosDurmiendo int `json:"procesos_durmiendo"`
    ProcesosZombies   int `json:"procesos_zombies"`
    ProcesosParados   int `json:"procesos_parados"`
}

// Struct para enviar a Locust
type SystemDataForLocust struct {
    TotalRam           int64   `json:"total_ram"`
    RamLibre           int64   `json:"ram_libre"`
    UsoRam             int64   `json:"uso_ram"`
    PorcentajeRam      float64 `json:"porcentaje_ram"`
    PorcentajeCpuUso   float64 `json:"porcentaje_cpu_uso"`
    PorcentajeCpuLibre float64 `json:"porcentaje_cpu_libre"`
    ProcesosCorriendo  int     `json:"procesos_corriendo"`
    TotalProcesos      int     `json:"total_procesos"`
    ProcesosDurmiendo  int     `json:"procesos_durmiendo"`
    ProcesosZombie     int     `json:"procesos_zombie"`
    ProcesosParados    int     `json:"procesos_parados"`
    Hora               string  `json:"hora"`
}

// Canales para comunicación entre goroutines
var (
    cpuChannel     = make(chan CpuData, 5)
    ramChannel     = make(chan RamData, 5)
    processChannel = make(chan ProcessData, 5)
)

// Variable para la URL de Locust (se configura por variable de entorno)
var locustURL string

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

// Función para leer datos del módulo de Procesos
func getProcessData() (ProcessData, error) {
    var processData ProcessData
    cmd := exec.Command("sh", "-c", "cat /proc/procesos_202202481")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return processData, fmt.Errorf("error leyendo Procesos: %v", err)
    }
    err = json.Unmarshal(output, &processData)
    if err != nil {
        return processData, fmt.Errorf("error parseando JSON Procesos: %v", err)
    }
    return processData, nil
}

// Goroutine Recolector de CPU
func cpuCollector(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            cpuData, err := getCpuData()
            if err != nil {
                fmt.Printf("❌ Error obteniendo datos CPU: %v\n", err)
                continue
            }
            select {
            case cpuChannel <- cpuData:
            default:
                fmt.Println("⚠️ Canal CPU lleno, saltando dato")
            }
        }
    }
}

// Goroutine Recolector de RAM
func ramCollector(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            ramData, err := getRamData()
            if err != nil {
                fmt.Printf("❌ Error obteniendo datos RAM: %v\n", err)
                continue
            }
            select {
            case ramChannel <- ramData:
            default:
                fmt.Println("⚠️ Canal RAM lleno, saltando dato")
            }
        }
    }
}

// Goroutine Recolector de Procesos
func processCollector(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            processData, err := getProcessData()
            if err != nil {
                fmt.Printf("❌ Error obteniendo datos Procesos: %v\n", err)
                continue
            }
            select {
            case processChannel <- processData:
            default:
                fmt.Println("⚠️ Canal Procesos lleno, saltando dato")
            }
        }
    }
}

// Goroutine Procesador de datos (envía a Locust)
func dataProcessor(ctx context.Context) {
    var lastCpuData CpuData
    var lastRamData RamData
    var lastProcessData ProcessData
    var hasCpu, hasRam, hasProcess bool

    for {
        select {
        case <-ctx.Done():
            return

        case cpuData := <-cpuChannel:
            lastCpuData = cpuData
            hasCpu = true
            if hasRam && hasProcess {
                sendToLocust(lastCpuData, lastRamData, lastProcessData)
            }

        case ramData := <-ramChannel:
            lastRamData = ramData
            hasRam = true
            if hasCpu && hasProcess {
                sendToLocust(lastCpuData, lastRamData, lastProcessData)
            }

        case processData := <-processChannel:
            lastProcessData = processData
            hasProcess = true
            if hasCpu && hasRam {
                sendToLocust(lastCpuData, lastRamData, lastProcessData)
            }
        }
    }
}

// Función que envía los datos a Locust
func sendToLocust(cpuData CpuData, ramData RamData, processData ProcessData) {
    // Crear estructura en el formato requerido por Locust
    systemData := SystemDataForLocust{
        TotalRam:           ramData.Total,
        RamLibre:           ramData.Libre,
        UsoRam:             ramData.Uso,
        PorcentajeRam:      ramData.Porcentaje,
        PorcentajeCpuUso:   cpuData.Porcentaje,
        PorcentajeCpuLibre: 100 - cpuData.Porcentaje,
        ProcesosCorriendo:  processData.ProcesosCorriendo,
        TotalProcesos:      processData.TotalProcesos,
        ProcesosDurmiendo:  processData.ProcesosDurmiendo,
        ProcesosZombie:     processData.ProcesosZombies,
        ProcesosParados:    processData.ProcesosParados,
        Hora:               time.Now().Format("2006-01-02 15:04:05"),
    }

    // Mostrar datos en consola
    fmt.Printf("📊 Sistema: CPU: %.1f%% | RAM: %.1f%% | Procesos: %d\n",
        systemData.PorcentajeCpuUso,
        systemData.PorcentajeRam,
        systemData.TotalProcesos)

    // Enviar a Locust
    jsonData, err := json.Marshal(systemData)
    if err != nil {
        fmt.Printf("❌ Error serializando JSON: %v\n", err)
        return
    }

    // Realizar petición POST a Locust
    if locustURL != "" {
        // Crear cliente HTTP con timeout
        client := &http.Client{
            Timeout: 5 * time.Second,
        }
        
        resp, err := client.Post(locustURL, "application/json", bytes.NewBuffer(jsonData))
        if err != nil {
            fmt.Printf("❌ Error enviando a Locust: %v\n", err)
        } else {
            defer resp.Body.Close()
            if resp.StatusCode == 200 {
                fmt.Printf("✅ Datos enviados a Locust: %s\n", systemData.Hora)
            } else {
                fmt.Printf("⚠️ Locust respondió con código: %d\n", resp.StatusCode)
            }
        }
    } else {
        fmt.Printf("⚠️ LOCUST_URL no configurada, datos preparados: %s\n", string(jsonData))
    }

    fmt.Println("════════════════════════════════════════════════")
}

// Función que recolecta y envía datos usando canales
func dataCollectorWithChannels() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Iniciar las 4 goroutines
    go cpuCollector(ctx)
    go ramCollector(ctx)
    go processCollector(ctx)
    go dataProcessor(ctx)

    fmt.Println("🚀 Sistema de recolección con canales iniciado (CPU + RAM + Procesos)")
    select {}
}

// Endpoints de Fiber
func setupRoutes(app *fiber.App) {
    app.Get("/", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "message":    "Sistema de Monitoreo - Proyecto SO1 Fase 2",
            "status":     "running",
            "time":       time.Now().Format("2006-01-02 15:04:05"),
            "locust_url": locustURL,
        })
    })

    app.Get("/cpu", func(c *fiber.Ctx) error {
        cpuData, err := getCpuData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }
        return c.JSON(cpuData)
    })

    app.Get("/ram", func(c *fiber.Ctx) error {
        ramData, err := getRamData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }
        return c.JSON(ramData)
    })

    app.Get("/procesos", func(c *fiber.Ctx) error {
        processData, err := getProcessData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }
        return c.JSON(processData)
    })

    // Endpoint que devuelve todos los datos en formato Locust
    app.Get("/system", func(c *fiber.Ctx) error {
        cpuData, err := getCpuData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Error CPU: " + err.Error()})
        }

        ramData, err := getRamData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Error RAM: " + err.Error()})
        }

        processData, err := getProcessData()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Error Procesos: " + err.Error()})
        }

        systemData := SystemDataForLocust{
            TotalRam:           ramData.Total,
            RamLibre:           ramData.Libre,
            UsoRam:             ramData.Uso,
            PorcentajeRam:      ramData.Porcentaje,
            PorcentajeCpuUso:   cpuData.Porcentaje,
            PorcentajeCpuLibre: 100 - cpuData.Porcentaje,
            ProcesosCorriendo:  processData.ProcesosCorriendo,
            TotalProcesos:      processData.TotalProcesos,
            ProcesosDurmiendo:  processData.ProcesosDurmiendo,
            ProcesosZombie:     processData.ProcesosZombies,
            ProcesosParados:    processData.ProcesosParados,
            Hora:               time.Now().Format("2006-01-02 15:04:05"),
        }

        return c.JSON(systemData)
    })
}

func main() {
    fmt.Println("🚀 Iniciando Sistema de Monitoreo - SO1 Proyecto Fase 2")
    fmt.Println("📡 Recolector de métricas para Locust")

    // Configurar URL de Locust desde variable de entorno
    locustURL = os.Getenv("LOCUST_URL")
    if locustURL == "" {
        fmt.Println("⚠️ Variable LOCUST_URL no configurada")
        fmt.Println("💡 Usar: export LOCUST_URL='http://tu-ip-local:8089/data'")
    } else {
        fmt.Printf("🎯 Enviando datos a: %s\n", locustURL)
    }

    app := fiber.New(fiber.Config{
        AppName: "Sistema Monitoreo SO1 - Fase 2",
    })

    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowMethods: "GET,POST,PUT,DELETE",
        AllowHeaders: "Origin,Content-Type,Accept,Authorization",
    }))

    setupRoutes(app)
    go dataCollectorWithChannels()

    fmt.Println("🌐 Servidor iniciado en puerto 5200")
    fmt.Println("📊 Endpoints disponibles:")
    fmt.Println("   GET /         - Estado del sistema")
    fmt.Println("   GET /cpu      - Datos de CPU")
    fmt.Println("   GET /ram      - Datos de RAM")
    fmt.Println("   GET /procesos - Datos de procesos")
    fmt.Println("   GET /system   - Datos completos (formato Locust)")

    log.Fatal(app.Listen(":5200"))
}

