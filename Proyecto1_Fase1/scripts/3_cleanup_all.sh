#!/bin/bash

echo "Limpiando sistema..."

# Descargar módulos del kernel
if lsmod | grep -q "cpu_202202481"; then
    sudo rmmod cpu_202202481
    echo "Módulo CPU descargado"
fi

if lsmod | grep -q "ram_202202481"; then
    sudo rmmod ram_202202481
    echo "Módulo RAM descargado"
fi

# Eliminar contenedores de estrés
STRESS_CONTAINERS=$(docker ps -aq --filter "name=stress-")
if [ -n "$STRESS_CONTAINERS" ]; then
    docker stop $STRESS_CONTAINERS >/dev/null 2>&1
    docker rm -f $STRESS_CONTAINERS >/dev/null 2>&1
    echo "Contenedores de estrés eliminados"
fi

# Detener docker-compose
if [ -f "docker-compose.yaml" ]; then
    docker-compose down >/dev/null 2>&1
    echo "Servicios docker-compose detenidos"
fi

# Limpiar contenedores del proyecto
PROJECT_CONTAINERS=$(docker ps -aq --filter "name=monitoreo-")
if [ -n "$PROJECT_CONTAINERS" ]; then
    docker rm -f $PROJECT_CONTAINERS >/dev/null 2>&1
fi

# Limpiar archivos compilados
if [ -d "./Kernel/cpu_metrics" ]; then
    cd "./Kernel/cpu_metrics" && make clean >/dev/null 2>&1 && cd - >/dev/null
fi

if [ -d "./Kernel/ram_metrics" ]; then
    cd "./Kernel/ram_metrics" && make clean >/dev/null 2>&1 && cd - >/dev/null
fi

echo "Limpieza completada"