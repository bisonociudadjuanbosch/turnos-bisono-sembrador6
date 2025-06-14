// server.js actualizado para Constructora Bisonó con toda la lógica completa
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

// Carpetas
const PUBLIC_DIR = path.join(__dirname, "public");
const IMAGES_DIR = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(IMAGES_DIR));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error conectando MongoDB:", err.message));

// Ruta de salud
app.get("/health", (req, res) => res.send("🟢 API viva"));

// Ruta principal
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
    const nuevo = await Turno.create({ numero, nombre, telefono, fechaHora });
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

// Cambiar etapa del turno y notificar siguiente pendiente
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

    // Notificar al siguiente turno pendiente
    const siguiente = await Turno.findOne({ etapa: "Pendiente" }).sort({ _id: 1 });
    if (siguiente) {
      await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_APIKEY,
        },
        params: {
          channel: "whatsapp",
          source: process.env.WABA_PHONE,
          destination: siguiente.telefono,
          message: JSON.stringify({
            type: "text",
            text: "¡Hola! es turno, por favor pasa con nuestro Oficial de Ventas Bisono. Gracias por preferirnos. Constructora Bisono."
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

// Subir imagen base64 del turno
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

// Enviar mensaje por WhatsApp manualmente
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;
  if (!numeroTelefono || !mensaje) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_APIKEY
      },
      params: {
        channel: "whatsapp",
        source: process.env.WABA_PHONE,
        destination: numeroTelefono,
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