FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código
COPY . .

# Variables de entorno por defecto
ENV DB_HOST=34.61.65.213
ENV DB_USER=root
ENV DB_PASSWORD=8AraHXK#EJL4\Fmq
ENV DB_NAME=sopes1_db
ENV DB_PORT=3306
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar
CMD ["npm", "start"]