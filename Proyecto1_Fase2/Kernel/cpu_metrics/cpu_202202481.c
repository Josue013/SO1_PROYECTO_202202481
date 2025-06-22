#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched/signal.h>
#include <linux/sched.h>
#include <linux/timekeeping.h>
#include <linux/time.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Josue Nabi Hurtarte Pinto");
MODULE_DESCRIPTION("Sistemas Operativos 1 - Proyecto - Fase 2");
MODULE_VERSION("1.0");

static int calcular_porcentaje_cpu(void) {
    struct task_struct *task;
    uint64_t total_time_cpu;
    uint64_t total_usage = 0;
    unsigned long porcentaje;

    // Sumar el tiempo de CPU de todos los procesos
    for_each_process(task) {
        uint64_t cpu_time_ns;
        cpu_time_ns = task->utime + task->stime;
        total_usage += cpu_time_ns;
    }

    // Obtener el tiempo total del sistema
    total_time_cpu = ktime_to_ns(ktime_get());

    // Calcular porcentaje
    if (total_time_cpu > 0) {
        porcentaje = (total_usage * 100) / total_time_cpu;
        // Asegurar que no supere 100%
        if (porcentaje > 100) {
            porcentaje = 100;
        }
    } else {
        porcentaje = 0;
    }

    return (int)porcentaje;
}

static int mostrar_cpu(struct seq_file *archivo, void *v) {
    int porcentaje = calcular_porcentaje_cpu();
    
    seq_printf(archivo, "{\n");
    seq_printf(archivo, "    \"porcentaje\": %d\n", porcentaje);
    seq_printf(archivo, "}\n");
    
    return 0;
}

static int abrir_proc(struct inode *inode, struct file *file) {
    return single_open(file, mostrar_cpu, NULL);
}

static const struct proc_ops cpu_ops = {
    .proc_open = abrir_proc,
    .proc_read = seq_read
};

static int __init _insert(void) {
    proc_create("cpu_202202481", 0444, NULL, &cpu_ops);
    printk(KERN_INFO "Modulo CPU cargado: /proc/cpu_202202481 creado\n");
    return 0;
}

static void __exit _delete(void) {
    remove_proc_entry("cpu_202202481", NULL);
    printk(KERN_INFO "Modulo CPU descargado: /proc/cpu_202202481 eliminado\n");
}

module_init(_insert);
module_exit(_delete);