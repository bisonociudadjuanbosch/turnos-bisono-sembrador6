# Usa imagen base Node.js con Debian
FROM node:18-bullseye

# Instalar dependencias necesarias para el módulo canvas
RUN apt-get update && apt-get install -y \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev build-essential && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivo de dependencias e instalar
COPY package*.json ./
RUN npm install --build-from-source

# Copiar el resto de la app
COPY . .

EXPOSE 10000
CMD ["node", "index.js"]
