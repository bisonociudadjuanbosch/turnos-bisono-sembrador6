# Usa Node.js oficial con Debian Bullseye
FROM node:18-bullseye

# Instala dependencias nativas necesarias para canvas
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Define directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia package.json y package-lock.json para instalar dependencias primero
COPY package*.json ./

# Instala dependencias npm, canvas se compilará con las librerías instaladas
RUN npm install

# Copia todo el código de tu proyecto
COPY . .

# Expone el puerto que usas (10000)
EXPOSE 10000

# Comando para iniciar la app
CMD ["node", "index.js"]
