# Define la imagen base de Node.js 24.1.0 en su versión "alpine"
FROM node:24.1.0-alpine

# Crea y establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia el archivo package.json y package-lock.json (o yarn.lock si estás utilizando Yarn)
# Esto permite que Docker cachee las capas de las dependencias de npm/yarn y mejore los tiempos de construcción
COPY package*.json ./

# Instala las dependencias de la aplicación
RUN npm install

# Copia todo el código fuente de la aplicación al directorio de trabajo del contenedor
COPY . .

# Expone el puerto 3000 en el contenedor (asegúrate de que este puerto coincida con el puerto en el que tu aplicación está escuchando)
EXPOSE 3000

# Comando para iniciar la aplicación cuando se ejecute el contenedor
CMD ["node", "index.js"]

# Construye la imagen Docker (asegúrate de ejecutar el comando desde el directorio que contiene el Dockerfile)
# docker build -t clase1_alpine1 .

# Ejecuta un contenedor basado en la imagen que acabas de crear
# docker run -p 3000:3000 clase1_alpine1