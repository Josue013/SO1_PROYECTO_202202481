#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <asm/uaccess.h>
#include <linux/seq_file.h>
#include <linux/mm.h>
#include <linux/sysinfo.h>


MODULE_LICENSE("GPL");
MODULE_AUTHOR("Josue Nabi Hurtarte Pinto");
MODULE_DESCRIPTION("Sistemas Operativos 1 - Proyecto - Fase 2");
MODULE_VERSION("1.0");

/*
estructura del archivo /proc/ram
{
    "total": 0,
    "libre": 0,
    "uso": 0
    "porcentaje": 0
}
*/

// Funcion que se llama cuando se lee el archivo /proc/ram
static int mostrar_ram(struct seq_file * archivo, void *v) {
    struct sysinfo ram_info;
    long total, libre, uso, porcentaje;

    // Obtener la informacion de la memoria
    si_meminfo(&ram_info);

    // Calcular total, libre, uso y porcentaje y convertir a MB
    total = (ram_info.totalram * ram_info.mem_unit) / (1024 * 1024);
    libre = (ram_info.freeram * ram_info.mem_unit) / (1024 * 1024);
    uso = total - libre;
    porcentaje = (uso * 100) / total;


    // Generar en formato JSON
    seq_printf(archivo, "{\n");
    seq_printf(archivo, "\"total\": %ld,\n", total);
    seq_printf(archivo, "\"libre\": %ld,\n", libre);
    seq_printf(archivo, "\"uso\": %ld,\n", uso);
    seq_printf(archivo, "\"porcentaje\": %ld\n", porcentaje);
    seq_printf(archivo, "}\n");

    return 0;
}


// Cuando se le hace un cat al modulo
static int abrir_proc(struct inode *inode, struct file *file) {
    return single_open(file, mostrar_ram, NULL);
}

// Estructura de operaciones del archivo /proc/ram
static struct proc_ops ram_ops = {
    .proc_open = abrir_proc,
    .proc_read = seq_read
};

// Funcion de inicializacion del modulo
static int _insert(void) {
    proc_create("ram_202202481", 0, NULL, &ram_ops);
    printk(KERN_INFO "Modulo RAM cargado: /proc/ram creado\n");
    return 0;
}

// Funcion de limpieza del modulo
static void _delete(void) {
    remove_proc_entry("ram_202202481", NULL);
    printk(KERN_INFO "Modulo RAM descargado: /proc/ram eliminado\n");
}

module_init(_insert);
module_exit(_delete);