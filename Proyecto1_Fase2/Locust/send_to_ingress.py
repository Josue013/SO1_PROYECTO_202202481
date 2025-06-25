import json
import subprocess
import time
from locust import HttpUser, between, task, events

def get_ingress_ip():
    """Obtener IP del ingress"""
    try:
        result = subprocess.run([
            "kubectl", "get", "ingress", "sopes1-ingress-proxy", 
            "-n", "sopes1-fase2", 
            "-o", "jsonpath={.status.loadBalancer.ingress[0].ip}"
        ], capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        return None
    except Exception as e:
        print(f"❌ Error obteniendo IP: {e}")
        return None

class DataSender:
    def __init__(self):
        self.data = []
        self.data_index = 0
        self.api_counter = {"python": 0, "nodejs": 0}
        self.total_sent = 0
        self.load_data()
        
    def load_data(self):
        """Cargar datos del archivo JSON"""
        try:
            with open("vm_traffic_data.json", 'r', encoding='utf-8') as file:
                raw_data = json.load(file)
            # Filtrar solo registros válidos (con más de solo 'hora')
            self.data = [record for record in raw_data if len(record) > 1]
            print(f"✅ Datos cargados: {len(self.data)} registros válidos")
            print(f"🎯 Se enviarán exactamente {len(self.data)} registros únicos")
        except Exception as e:
            print(f"❌ Error cargando datos: {e}")
            self.data = []
    
    def get_next_record(self):
        """Obtener el siguiente registro de datos (SIN repetir)"""
        if not self.data or self.data_index >= len(self.data):
            return None  # ← Ya no hay más datos únicos
        
        record = self.data[self.data_index]
        self.data_index += 1
        return record
    
    def is_finished(self):
        """Verificar si ya se enviaron todos los registros únicos"""
        return self.data_index >= len(self.data)
    
    def update_stats(self, api_used):
        """Actualizar estadísticas de distribución"""
        self.total_sent += 1
        
        if 'python' in api_used.lower():
            self.api_counter["python"] += 1
        elif 'nodejs' in api_used.lower():
            self.api_counter["nodejs"] += 1
        
        # Mostrar progreso cada 50 registros
        if self.total_sent % 50 == 0:
            python_pct = (self.api_counter["python"] / self.total_sent) * 100
            nodejs_pct = (self.api_counter["nodejs"] / self.total_sent) * 100
            progress_pct = (self.total_sent / len(self.data)) * 100
            print(f"📊 Enviados: {self.total_sent}/{len(self.data)} ({progress_pct:.1f}%) | Python: {self.api_counter['python']} ({python_pct:.1f}%) | Node.js: {self.api_counter['nodejs']} ({nodejs_pct:.1f}%)")

# Instancia global del enviador
sender = DataSender()

class TrafficSplitUser(HttpUser):
    wait_time = between(1, 4)  # Entre 1-4 segundos según requerimientos
    
    def on_start(self):
        print(f"👤 Usuario de Traffic Split iniciado")
    
    @task
    def send_to_metrics(self):
        """Enviar datos al endpoint /metrics con traffic splitting"""
        
        # ✅ VERIFICAR SI YA TERMINAMOS
        if sender.is_finished():
            print(f"✅ Todos los {len(sender.data)} registros únicos han sido enviados")
            print("🛑 Deteniendo este usuario...")
            self.environment.runner.quit()
            return
        
        record = sender.get_next_record()
        
        if record:
            try:
                with self.client.post("/metrics", 
                                    json=record,
                                    headers={'Content-Type': 'application/json'},
                                    catch_response=True) as response:
                    
                    if response.status_code in [200, 201]:
                        try:
                            result = response.json()
                            api_used = result.get('api', 'unknown')
                            sender.update_stats(api_used)
                            response.success()
                        except:
                            response.success()  # Aún es exitoso aunque no podamos parsear JSON
                    else:
                        response.failure(f"HTTP {response.status_code}")
                        
            except Exception as e:
                print(f"❌ Error enviando datos: {e}")
        else:
            # Si no hay más datos únicos, detener este usuario
            print("✅ No hay más registros únicos que enviar")
            self.environment.runner.quit()

@events.quitting.add_listener
def on_locust_quit(environment, **kwargs):
    """Mostrar estadísticas finales cuando Locust termine"""
    print("\n" + "=" * 60)
    print("🎯 RESUMEN FINAL DEL TRAFFIC SPLITTING:")
    print("=" * 60)
    print(f"📊 Total enviado: {sender.total_sent} registros")
    print(f"📋 Total disponible: {len(sender.data)} registros")
    print(f"📈 Eficiencia: {(sender.total_sent/len(sender.data)*100):.1f}% de registros únicos enviados")
    if sender.total_sent > 0:
        python_pct = (sender.api_counter['python'] / sender.total_sent) * 100
        nodejs_pct = (sender.api_counter['nodejs'] / sender.total_sent) * 100
        print(f"🐍 Python API: {sender.api_counter['python']} registros ({python_pct:.1f}%)")
        print(f"🟢 Node.js API: {sender.api_counter['nodejs']} registros ({nodejs_pct:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    ingress_ip = get_ingress_ip()
    
    print("=" * 70)
    print("⚖️ ENVIADOR CON TRAFFIC SPLITTING - PROYECTO SO1 FASE 2")
    print("=" * 70)
    print("")
    if ingress_ip:
        print(f"✅ IP del Ingress detectada: {ingress_ip}")
        print("")
        print("🎯 CONFIGURACIÓN REQUERIDA:")
        print("   👥 Users: 150")
        print("   ⚡ Spawn rate: 1 user/seg")
        print("   ⏱️ Wait time: 1-4 segundos")
        print("   📊 Target: Traffic Split 50/50")
        print("   🔒 Límite: Solo registros únicos del JSON")
        print("")
        print("💻 COMANDO:")
        print(f"   locust -f send_to_ingress.py --host=http://{ingress_ip} \\")
        print("          --users 150 --spawn-rate 1 --run-time 180s --headless")
    else:
        print("❌ No se pudo obtener IP del ingress automáticamente")
        print("")
        print("💻 COMANDO MANUAL:")
        print("   locust -f send_to_ingress.py --host=http://INGRESS_IP \\")
        print("          --users 150 --spawn-rate 1 --run-time 180s --headless")
    print("")
    print("📋 REQUISITOS PREVIOS:")
    print("   ✓ Archivo vm_traffic_data.json debe existir")
    print("   ✓ Ingress debe estar funcionando")
    print("   ✓ Traffic splitting configurado")
    print("=" * 70)

"""
COMANDOS PARA EJECUTAR:

1. Recopilar datos de VM (300 usuarios, 3+ min):
   locust -f traffic_collector.py --host=http://IP_VM:5200 \
          --users 300 --spawn-rate 1 --run-time 180s --headless

2. Enviar al traffic splitting (150 usuarios):
   locust -f send_to_ingress.py --host=http://34.54.102.72 \
          --users 150 --spawn-rate 1 --run-time 180s --headless
"""