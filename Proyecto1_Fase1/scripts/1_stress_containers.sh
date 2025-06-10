#!/bin/bash

echo "Iniciando contenedores de estrés intensivo..."

if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker no está corriendo"
    exit 1
fi

# Descargar imagen si no existe
echo "Verificando imagen alexeiled/stress-ng..."
if ! docker images | grep -q "alexeiled/stress-ng"; then
    echo "Descargando imagen alexeiled/stress-ng..."
    docker pull alexeiled/stress-ng
else
    echo "Imagen alexeiled/stress-ng ya existe"
fi

# Contenedores de CPU intensivo (4 contenedores)
for i in {1..4}; do
    docker run -d --name stress-cpu-$i --cpus="1.5" alexeiled/stress-ng \
        --cpu 0 --cpu-method all --aggressive --timeout 0
    echo "Contenedor stress-cpu-$i creado (CPU intensivo)"
done

# Contenedores de RAM (5 contenedores)
for i in {1..5}; do
    docker run -d --name stress-ram-$i --memory="1200m" alexeiled/stress-ng \
        --vm 2 --vm-bytes 1000m --vm-keep --timeout 0
    echo "Contenedor stress-ram-$i creado (1GB)"
done

# Contenedor mixto (1 contenedor - CPU + RAM adicional)
docker run -d --name stress-mixed-1 --memory="1200m" --cpus="1" alexeiled/stress-ng \
    --cpu 2 --vm 1 --vm-bytes 1000m --vm-keep --io 4 --timeout 0
echo "Contenedor stress-mixed-1 creado (CPU + RAM + I/O)"

echo "10 contenedores de estrés desplegados"
echo "Uso esperado: ~5GB RAM + 90-100% CPU"
docker ps --filter "name=stress-"