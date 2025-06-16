require('dotenv').config();  // Cargar variables de entorno desde .env

const express = require('express');
const mongoose = require('mongoose');

const app = express();

const port = process.env.PORT || 10000;
const gupshupApiKey = process.env.GUPSHUP_APIKEY;
const gupshupSource = process.env.GUPSHUP_SOURCE;
const gupshupSrcName = process.env.GUPSHUP_SRC_NAME;
const mongodbUri = process.env.MONGODB_URI;

console.log('Puerto:', port);
console.log('API Key Gupshup:', gupshupApiKey);
console.log('Fuente Gupshup:', gupshupSource);
console.log('Nombre fuente:', gupshupSrcName);
console.log('URI MongoDB:', mongodbUri);

// Middleware para parsear JSON
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

// Conectar a MongoDB
mongoose.connect(mongodbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Conectado a MongoDB exitosamente');

  // Iniciar servidor solo después de conectar a la DB
  app.listen(port, () => {
    console.log(`Servidor escuchando en puerto ${port}`);
  });

})
.catch(err => {
  console.error('Error al conectar a MongoDB:', err);
});
