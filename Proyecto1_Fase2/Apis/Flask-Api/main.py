from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import os
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database connection settings usando .env
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT')),
    'charset': 'utf8mb4'
}

def get_db_connection():
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"❌ [PYTHON API] Error connecting to database: {e}")
        return None

# Endpoint de salud para verificar que la API está funcionando
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'python-flask-api',
        'timestamp': datetime.now().isoformat()
    }), 200

# Endpoint para recibir métricas del sistema
@app.route('/metrics', methods=['POST'])
def receive_metrics():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400
        
        print(f"🐍 [PYTHON API] Datos recibidos: {len(data) if isinstance(data, list) else 1} registros")
        
        # Procesar datos (puede ser array o objeto único)
        if isinstance(data, list):
            inserted_count = 0
            for record in data:
                if insert_system_metrics(record):
                    inserted_count += 1
            
            print(f"✅ [PYTHON API] Insertados {inserted_count}/{len(data)} registros")
            return jsonify({
                'message': f'Processed {len(data)} records',
                'inserted': inserted_count,
                'api': 'python-flask'
            }), 200
        else:
            if insert_system_metrics(data):
                print("✅ [PYTHON API] Registro insertado exitosamente")
                return jsonify({
                    'message': 'Record inserted successfully',
                    'api': 'python-flask'
                }), 200
            else:
                return jsonify({'error': 'Failed to insert record'}), 500
                
    except Exception as e:
        print(f"❌ [PYTHON API] Error: {e}")
        return jsonify({'error': str(e)}), 500

def insert_system_metrics(data):
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # Extraer datos según el formato del JSON actualizado
        ram_total = data.get('total_ram', 0)
        ram_free = data.get('ram_libre', 0)
        ram_used = data.get('uso_ram', 0)
        ram_percentage = data.get('porcentaje_ram', 0)
        cpu_usage = data.get('porcentaje_cpu_uso', 0)
        cpu_free = data.get('porcentaje_cpu_libre', 0)
        
        # Procesos
        running_processes = data.get('procesos_corriendo', 0)
        total_processes = data.get('total_procesos', 0)
        sleeping_processes = data.get('procesos_durmiendo', 0)
        zombie_processes = data.get('procesos_zombie', 0)
        stopped_processes = data.get('procesos_parados', 0)
        
        query = """
        INSERT INTO system_metrics 
        (ram_total, ram_free, ram_used, ram_percentage, cpu_usage, cpu_free,
         running_processes, total_processes, sleeping_processes, 
         zombie_processes, stopped_processes, data_source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            ram_total, ram_free, ram_used, ram_percentage, cpu_usage, cpu_free,
            running_processes, total_processes, sleeping_processes,
            zombie_processes, stopped_processes, 'python_api'
        )
        
        cursor.execute(query, values)
        connection.commit()
        
        print(f"🐍 [PYTHON API] CPU: {cpu_usage}%, RAM: {ram_percentage}%, Procesos: {total_processes}")
        return True
        
    except Exception as e:
        print(f"❌ [PYTHON API] Error insertando: {e}")
        return False
    finally:
        connection.close()

if __name__ == '__main__':
    print("🐍 Iniciando Python Flask API...")
    print(f"🔗 Conectando a: {os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}")
    app.run(host='0.0.0.0', port=5000, debug=True)