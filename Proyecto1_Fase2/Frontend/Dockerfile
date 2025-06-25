FROM node:24.1.0-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Construir para producción
RUN npm run build

# Instalar serve para servir archivos estáticos
RUN npm install -g serve

EXPOSE 5173

# Servir los archivos de build
CMD ["serve", "-s", "dist", "-l", "5173"]