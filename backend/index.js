require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Para recibir imágenes base64

// Variables de entorno obligatorias
const {
  MONGODB_URI,
  GUPSHUP_APIKEY,
  WABA_PHONE,
  APP_NAME,
  APP_URL
} = process.env;

if (!MONGODB_URI || !GUPSHUP_APIKEY || !WABA_PHONE || !APP_NAME) {
  console.error("❌ Faltan variables obligatorias en .env");
  process.exit(1);
}

// Conectar a MongoDB Atlas
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Conectado a MongoDB Atlas");
}).catch((err) => {
  console.error("❌ Error conectando a MongoDB:", err);
  process.exit(1);
});

// Definimos esquema y modelo para Turnos
const turnoSchema = new mongoose.Schema({
  nombre: String,
  telefono: String,
  numero: String,
  fecha: { type: Date, default: Date.now }
});
const Turno = mongoose.model('Turno', turnoSchema);

// Función para generar número de turno único
async function generarNumeroTurno() {
  const count = await Turno.countDocuments();
  // Ejemplo: T-0001, T-0002 ...
  const numero = "T-" + (count + 1).toString().padStart(4, "0");
  return numero;
}

// Ruta POST /turnos - crear nuevo turno
app.post('/turnos', async (req, res) => {
  try {
    const { nombre, telefono } = req.body;
    if (!telefono) return res.status(400).json({ error: "Teléfono es obligatorio" });

    const numero = await generarNumeroTurno();

    const nuevoTurno = new Turno({ nombre, telefono, numero });
    await nuevoTurno.save();

    // Enviar mensaje WhatsApp al cliente con el número de turno
    enviarWhatsApp(telefono, `¡Hola ${nombre || ''}! Tu turno es: ${numero}. Gracias por preferir Constructora Bisonó.`);

    res.json({ numero });
  } catch (err) {
    console.error("Error creando turno:", err);
    res.status(500).json({ error: "Error al crear turno" });
  }
});

// Ruta POST /subir-imagen - recibe base64 y guarda imagen en /tickets
app.post('/subir-imagen', (req, res) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return res.status(400).json({ error: "No se envió imagen" });

    // Extraer base64 sin data:image/jpeg;base64,
    const base64Data = imagen.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Crear carpeta tickets si no existe
    const carpetaTickets = path.join(__dirname, 'tickets');
    if (!fs.existsSync(carpetaTickets)) {
      fs.mkdirSync(carpetaTickets);
    }

    // Nombre archivo con timestamp
    const fileName = `turno-${Date.now()}.jpg`;
    const filePath = path.join(carpetaTickets, fileName);

    fs.writeFileSync(filePath, buffer);

    // URL pública (ajustar si tienes dominio o hosting real)
    const urlImagen = `${APP_URL}/tickets/${fileName}`;

    res.json({ url: urlImagen });
  } catch (err) {
    console.error("Error guardando imagen:", err);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// Servir archivos estáticos para acceder a las imágenes
app.use('/tickets', express.static(path.join(__dirname, 'tickets')));

// Función para enviar WhatsApp vía Gupshup
async function enviarWhatsApp(numeroDestino, mensaje) {
  try {
    // Formato número internacional sin '+', ejemplo "18096690177"
    const phone = numeroDestino.replace(/\D/g, '');

    const url = `https://api.gupshup.io/sm/api/v1/msg`;
    const data = {
      channel: "whatsapp",
      source: WABA_PHONE,
      destination: phone,
      message: {
        type: "text",
        text: mensaje
      }
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
        "apikey": GUPSHUP_APIKEY
      }
    };

    const response = await axios.post(url, data, config);
    console.log("WhatsApp enviado:", response.data);
  } catch (error) {
    console.error("Error enviando WhatsApp:", error.response ? error.response.data : error.message);
  }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
