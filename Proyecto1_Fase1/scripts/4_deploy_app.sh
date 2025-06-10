#!/bin/bash

echo "Desplegando aplicación..."

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker no está corriendo"
    exit 1
fi

if [ ! -f "docker-compose.yaml" ]; then
    echo "Error: docker-compose.yaml no encontrado"
    exit 1
fi

# Limpiar contenedores anteriores
docker-compose down -v >/dev/null 2>&1

# Descargar imágenes
docker-compose pull

# Levantar servicios
docker-compose up -d

echo "Aplicación desplegada"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3000"
echo "Recollector: http://localhost:5200"
echo "Database: localhost:3306"

docker-compose ps