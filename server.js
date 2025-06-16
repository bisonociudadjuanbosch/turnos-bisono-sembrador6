require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();

const port = process.env.PORT || 10000;
const mongodbUri = process.env.MONGODB_URI || '';

// Conectar a MongoDB
mongoose.connect(mongodbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Conectado a MongoDB');
}).catch(err => {
  console.error('Error conexión MongoDB:', err);
});

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});
