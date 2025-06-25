#!/bin/bash

echo "Iniciando stress en VM..."

# Contenedores CPU
docker run -d --name stress-cpu-1 --cpus="1" alexeiled/stress-ng \
    --cpu 0 --cpu-method all --aggressive --timeout 0
docker run -d --name stress-cpu-2 --cpus="1" alexeiled/stress-ng \
    --cpu 0 --cpu-method all --aggressive --timeout 0

# Contenedores RAM
docker run -d --name stress-ram-1 --memory="1200m" alexeiled/stress-ng --vm 1 --vm-bytes 1000m --vm-keep --timeout 0
docker run -d --name stress-ram-2 --memory="1200m" alexeiled/stress-ng --vm 1 --vm-bytes 1000m --vm-keep --timeout 0

echo "Stress iniciado: 2 contenedores CPU + 2 contenedores RAM"