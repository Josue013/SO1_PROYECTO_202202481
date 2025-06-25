#!/bin/bash

echo "Limpiando contenedores..."

# Eliminar contenedores CPU
docker stop stress-cpu-1 stress-cpu-2 2>/dev/null
docker rm -f stress-cpu-1 stress-cpu-2 2>/dev/null

# Eliminar contenedores RAM
docker stop stress-ram-1 stress-ram-2 2>/dev/null
docker rm -f stress-ram-1 stress-ram-2 2>/dev/null

echo "Contenedores eliminados"