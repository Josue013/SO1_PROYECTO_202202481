#!/bin/bash

echo "Instalando módulos del kernel..."

CPU_DIR="./Kernel/cpu_metrics"
RAM_DIR="./Kernel/ram_metrics"

# Verificar permisos
if ! sudo -n true 2>/dev/null; then
    sudo -v
fi

# Instalar módulo CPU
if [ -d "$CPU_DIR" ]; then
    cd "$CPU_DIR"
    make clean >/dev/null 2>&1
    
    if make all >/dev/null 2>&1; then
        if lsmod | grep -q "cpu_202202481"; then
            sudo rmmod cpu_202202481 2>/dev/null
        fi
        sudo insmod cpu_202202481.ko
        echo "Módulo CPU instalado: /proc/cpu_202202481"
    else
        echo "Error compilando módulo CPU"
    fi
    cd - >/dev/null
fi

# Instalar módulo RAM
if [ -d "$RAM_DIR" ]; then
    cd "$RAM_DIR"
    make clean >/dev/null 2>&1
    
    if make all >/dev/null 2>&1; then
        if lsmod | grep -q "ram_202202481"; then
            sudo rmmod ram_202202481 2>/dev/null
        fi
        sudo insmod ram_202202481.ko
        echo "Módulo RAM instalado: /proc/ram_202202481"
    else
        echo "Error compilando módulo RAM"
    fi
    cd - >/dev/null
fi

echo "Verificando instalación:"
lsmod | grep "202202481"
ls -la /proc/*202202481* 2>/dev/null