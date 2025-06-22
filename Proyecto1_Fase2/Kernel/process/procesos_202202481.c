#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Josue Nabi Hurtarte Pinto");
MODULE_DESCRIPTION("Sistemas Operativos 1 - Proyecto - Fase 2");
MODULE_VERSION("1.0");

/*
Estructura del archivo /proc/procesos_202202481
{
  "procesos_corriendo": 123,
  "total_procesos": 233,
  "procesos_durmiendo": 65,
  "procesos_zombies": 65,
  "procesos_parados": 65
}
*/

// Estados de procesos del kernel
#define TASK_RUNNING            0x00000000
#define TASK_INTERRUPTIBLE      0x00000001
#define TASK_UNINTERRUPTIBLE    0x00000002
#define __TASK_STOPPED          0x00000004
#define __TASK_TRACED           0x00000008
// Estados de salida
#define EXIT_DEAD               0x00000010
#define EXIT_ZOMBIE             0x00000020

// Función que cuenta los procesos por estado
static void contar_procesos(int *corriendo, int *total, int *durmiendo, int *zombies, int *parados) {
    struct task_struct *task;
    
    // Inicializar contadores
    *corriendo = 0;
    *total = 0;
    *durmiendo = 0;
    *zombies = 0;
    *parados = 0;

    // Iterar sobre todos los procesos del sistema
    for_each_process(task) {
        (*total)++;
        
        // Verificar el estado del proceso
        if (task->__state == TASK_RUNNING) {
            (*corriendo)++;
        }
        else if (task->__state & (TASK_INTERRUPTIBLE | TASK_UNINTERRUPTIBLE)) {
            (*durmiendo)++;
        }
        else if (task->__state & (__TASK_STOPPED | __TASK_TRACED)) {
            (*parados)++;
        }
        
        // Verificar si es zombie
        if (task->exit_state & EXIT_ZOMBIE) {
            (*zombies)++;
        }
    }
}

// Función que se llama cuando se lee el archivo /proc/procesos_202202481
static int mostrar_procesos(struct seq_file *archivo, void *v) {
    int procesos_corriendo, total_procesos, procesos_durmiendo, procesos_zombies, procesos_parados;
    
    // Obtener conteos de procesos
    contar_procesos(&procesos_corriendo, &total_procesos, &procesos_durmiendo, &procesos_zombies, &procesos_parados);
    
    // Generar salida en formato JSON
    seq_printf(archivo, "{\n");
    seq_printf(archivo, "  \"procesos_corriendo\": %d,\n", procesos_corriendo);
    seq_printf(archivo, "  \"total_procesos\": %d,\n", total_procesos);
    seq_printf(archivo, "  \"procesos_durmiendo\": %d,\n", procesos_durmiendo);
    seq_printf(archivo, "  \"procesos_zombies\": %d,\n", procesos_zombies);
    seq_printf(archivo, "  \"procesos_parados\": %d\n", procesos_parados);
    seq_printf(archivo, "}\n");
    
    return 0;
}

// Cuando se le hace un cat al módulo
static int abrir_proc(struct inode *inode, struct file *file) {
    return single_open(file, mostrar_procesos, NULL);
}

// Estructura de operaciones del archivo /proc/procesos_202202481
static const struct proc_ops procesos_ops = {
    .proc_open = abrir_proc,
    .proc_read = seq_read
};

// Función de inicialización del módulo
static int __init _insert(void) {
    proc_create("procesos_202202481", 0444, NULL, &procesos_ops);
    printk(KERN_INFO "Modulo Procesos cargado: /proc/procesos_202202481 creado\n");
    return 0;
}

// Función de limpieza del módulo
static void __exit _delete(void) {
    remove_proc_entry("procesos_202202481", NULL);
    printk(KERN_INFO "Modulo Procesos descargado: /proc/procesos_202202481 eliminado\n");
}

module_init(_insert);
module_exit(_delete);