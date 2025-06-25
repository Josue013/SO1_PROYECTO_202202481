FROM python:3.9-slim

WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Variables de entorno por defecto
ENV DB_HOST=34.61.65.213
ENV DB_USER=root
ENV DB_PASSWORD=8AraHXK#EJL4\Fmq
ENV DB_NAME=sopes1_db
ENV DB_PORT=3306

# Exponer puerto
EXPOSE 5000

# Comando para ejecutar
CMD ["python", "main.py"]