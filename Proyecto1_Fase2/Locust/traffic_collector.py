import json
import time
from random import randrange
from locust import HttpUser, between, task

class VMDataCollector:
    def __init__(self):
        self.data = []
        self.target_records = 2000
        
    def addData(self, new_data):
        """Agregar datos obtenidos de la VM"""
        if len(self.data) < self.target_records:
            # Agregar timestamp si no existe
            if 'hora' not in new_data:
                new_data['hora'] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            # Solo agregar si tiene datos válidos (no solo hora)
            if len(new_data) > 1:
                self.data.append(new_data)
                print(f"📊 Datos recolectados: {len(self.data)}/{self.target_records}")
                return True
        return False
    
    def saveToFile(self):
        """Guardar datos recolectados en JSON"""
        filename = 'vm_traffic_data.json'
        try:
            with open(filename, 'w', encoding='utf-8') as file:
                json.dump(self.data, file, indent=2, ensure_ascii=False)
            print(f"✅ Datos guardados en: {filename}")
            print(f"📈 Total registros válidos: {len(self.data)}")
            return filename
        except Exception as e:
            print(f'❌ Error guardando archivo: {e}')
            return None

# Instancia global del recolector
collector = VMDataCollector()

class VMTrafficGenerator(HttpUser):
    wait_time = between(1, 2)
    
    def on_start(self):
        print(f"👤 Usuario iniciado - Objetivo: {collector.target_records} registros")
    
    @task
    def collect_vm_data(self):
        """Recolectar datos de la VM"""
        if len(collector.data) < collector.target_records:
            try:
                with self.client.get("/system", catch_response=True) as response:
                    if response.status_code == 200:
                        vm_data = response.json()
                        
                        # Validar que tenga datos útiles
                        if vm_data and len(vm_data) > 1:
                            collector.addData(vm_data)
                            response.success()
                            print(f"✅ VM → CPU: {vm_data.get('porcentaje_cpu_uso', 'N/A')}% | RAM: {vm_data.get('porcentaje_ram', 'N/A')}%")
                        else:
                            response.failure("Datos incompletos de VM")
                    else:
                        response.failure(f"Error {response.status_code}")
            except Exception as e:
                print(f"❌ Error obteniendo datos de VM: {e}")
        else:
            # Cuando tengamos suficientes datos, guardar y terminar
            print(f"🎯 Objetivo de {collector.target_records} registros alcanzado!")
            filename = collector.saveToFile()
            if filename:
                print("✅ Datos listos para enviar al ingress")
                print(f"🚀 Ejecutar: python send_to_ingress.py")
            self.environment.runner.quit()

if __name__ == "__main__":
    print("=" * 60)
    print("📡 RECOLECTOR DE DATOS DE VM - PROYECTO SO1 FASE 2")
    print("=" * 60)
    print("")
    print("🎯 USO:")
    print("   locust -f traffic_collector.py --host=http://IP_VM:5200")
    print("")
    print("📋 CONFIGURACIÓN RECOMENDADA:")
    print("   👥 Users: 10-20")
    print("   ⚡ Spawn rate: 2")
    print("   ⏱️ Duration: 300s (5 min)")
    print("")
    print("🔄 Después ejecutar: python send_to_ingress.py")
    print("=" * 60)

"""

locust -f traffic_collector.py --host=http://34.67.58.132:5200

"""