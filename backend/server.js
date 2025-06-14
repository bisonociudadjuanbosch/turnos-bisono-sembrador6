// server.js para Constructora Bisonó con WhatsApp Gupshup y Turnos
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const Turno = require("./models/turno");

const app = express();
const PORT = process.env.PORT || 10000;

// Verificación de variables de entorno
if (!process.env.GUPSHUP_APIKEY || !process.env.WABA_PHONE || !process.env.APP_NAME) {
  console.warn("⚠️ Faltan variables en .env: GUPSHUP_APIKEY, WABA_PHONE o APP_NAME");
}

// === UTILS ===
function normalizarTelefono(telefono) {
  return telefono.replace(/\D/g, ''); // elimina todo lo que no sea número
}

// === RUTAS DE ARCHIVOS ===
const PUBLIC_DIR = path.join(__dirname, "public");
const IMAGES_DIR = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(IMAGES_DIR));

// === CONEXIÓN A MONGO ===
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB Atlas"))
.catch(err => console.error("❌ Error conectando MongoDB:", err.message));

// === RUTAS ===

// Ruta de salud
app.get("/health", (req, res) => res.send("🟢 API viva"));

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🟢 API de Turnos Bisonó funcionando. Usa /turnos para obtener los turnos.");
});

// Crear nuevo turno
app.post("/turnos", async (req, res) => {
  try {
    const { numero, nombre, telefono, fechaHora } = req.body;
    if (!numero || !nombre || !telefono || !fechaHora) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }
    const nuevo = await Turno.create({ numero, nombre, telefono: normalizarTelefono(telefono), fechaHora });
    res.json(nuevo);
  } catch (err) {
    console.error("❌ Error creando turno:", err.message);
    res.status(500).json({ error: "No se pudo crear el turno" });
  }
});

// Obtener todos los turnos
app.get("/turnos", async (req, res) => {
  try {
    const resultados = await Turno.find().sort({ _id: 1 });
    res.json({ resultados });
  } catch (err) {
    console.error("❌ Error obteniendo turnos:", err.message);
    res.status(500).json({ error: "Error al obtener los turnos" });
  }
});

// Cambiar etapa del turno y notificar al siguiente
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  if (!numero || !nuevaEtapa) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const actualizado = await Turno.findOneAndUpdate(
      { numero },
      { etapa: nuevaEtapa },
      { new: true }
    );

    if (!actualizado) return res.status(404).json({ error: "Turno no encontrado" });

    const siguiente = await Turno.findOne({ etapa: "Pendiente" }).sort({ _id: 1 });

    if (siguiente) {
      const numeroDestino = normalizarTelefono(siguiente.telefono);
      await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_APIKEY,
        },
        params: {
          channel: "whatsapp",
          source: process.env.WABA_PHONE,
          destination: numeroDestino,
          message: JSON.stringify({
            type: "text",
            text: "¡Hola! Es tu turno, por favor pasa con nuestro Oficial de Ventas Bisonó. Gracias por preferirnos."
          }),
          "src.name": process.env.APP_NAME
        }
      });
    }

    res.json(actualizado);
  } catch (err) {
    console.error("❌ Error cambiando etapa:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al cambiar la etapa" });
  }
});

// Subir imagen base64 del ticket
app.post("/upload-turno", async (req, res) => {
  const { image } = req.body;
  if (!image || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Formato de imagen inválido" });
  }

  try {
    const ext = image.substring("data:image/".length, image.indexOf(";base64"));
    const base64Data = image.split(";base64,").pop();
    const filename = `turno-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(IMAGES_DIR, filename);

    fs.writeFileSync(filePath, base64Data, "base64");
    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("❌ Error guardando imagen:", err.message);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// Enviar mensaje de WhatsApp manual
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;
  if (!numeroTelefono || !mensaje) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const destino = normalizarTelefono(numeroTelefono);
    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_APIKEY,
      },
      params: {
        channel: "whatsapp",
        source: process.env.WABA_PHONE,
        destination: destino,
        message: JSON.stringify({ type: "text", text: mensaje }),
        "src.name": process.env.APP_NAME
      }
    });

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
