// index.js (raíz del proyecto)
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { createCanvas } = require("canvas");
const Turno = require("./models/Turno");
const uploadTurnoRouter = require("./upload-turno");

const app = express();

// 1. Configuración del servidor
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// 2. Servir imágenes de tickets
const TICKETS_DIR = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR);
app.use("/tickets", express.static(TICKETS_DIR));

// 3. Rutas de subida de imágenes
app.use("/", uploadTurnoRouter);

const port = process.env.PORT || 10000;
const mongodbUri = process.env.MONGODB_URI;

// 4. Conexión a MongoDB
const mongodbUri = process.env.MONGODB_URI;
mongoose.connect(mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error conexión MongoDB:", err));

// 5. Endpoint para generar turno + ticket + WhatsApp
app.post("/turnos", async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!telefono) return res.status(400).json({ error: "El teléfono es obligatorio" });

  try {
    const ultimoTurno = await Turno.findOne().sort({ numeroTurno: -1 });
    const nuevoNumero = ultimoTurno ? ultimoTurno.numeroTurno + 1 : 1;

    const nuevoTurno = new Turno({ nombre, telefono, numeroTurno: nuevoNumero });
    await nuevoTurno.save();

    const enEspera = await Turno.countDocuments({ estado: { $in: ["Pendiente", "En Proceso"] } });

    const filePath = await generarTicketVisual({ nombre, numeroTurno: nuevoNumero, fecha: nuevoTurno.fecha, enEspera });
    await enviarImagenWhatsApp(telefono, filePath);

    res.json({
      numeroTurno: nuevoNumero,
      enEspera,
      imagenUrl: `${process.env.APP_URL}/tickets/${path.basename(filePath)}`
    });
  } catch (err) {
    console.error("❌ Error al generar turno:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 6. Funciones utilitarias
async function generarTicketVisual({ nombre, numeroTurno, fecha, enEspera }) {
  const width = 600, height = 400;
  const canvas = createCanvas(width, height), ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000000"; ctx.font = "bold 18px Arial";
  const lines = [
    "CONSTRUCTORA BISONO",
    "Calle Olof Palme, Esq. Av. Luperón, D.N.",
    "Tel: 809-548-6353",
    "Residencial El Sembrador VI",
    "Ciudad Juan Bosch, SDE",
    "",
    `TURNO: ${numeroTurno}`,
    `Nombre: ${nombre || "No especificado"}`,
    `Fecha y Hora: ${new Date(fecha).toLocaleString()}`,
    `Personas en espera: ${enEspera}`
  ];
  lines.forEach((l, i) => ctx.fillText(l, 40, 40 + i * 35));

  const filePath = path.join(TICKETS_DIR, `turno_${numeroTurno}.jpg`);
  const out = fs.createWriteStream(filePath);
  canvas.createJPEGStream().pipe(out);

  return new Promise((res, rej) => out.on("finish", () => res(filePath)), out.on("error", rej));
}

async function enviarImagenWhatsApp(destino, filePath) {
  try {
    const publicUrl = `${process.env.APP_URL}/tickets/${path.basename(filePath)}`;
    const data = new FormData();
    data.append("channel", "whatsapp");
    data.append("source", process.env.GUPSHUP_SOURCE);
    data.append("destination", destino);
    data.append("src.name", process.env.GUPSHUP_SRC_NAME);
    data.append("message", JSON.stringify({
      type: "image",
      originalUrl: publicUrl,
      previewUrl: publicUrl,
      caption: "Este es tu turno para Constructora Bisonó"
    }));

    await axios.post("https://api.gupshup.io/sm/api/v1/msg", data, {
      headers: { ...data.getHeaders(), apikey: process.env.GUPSHUP_APIKEY }
    });
    console.log("📲 Ticket enviado a WhatsApp:", destino);
  } catch (err) {
    console.error("❌ Error al enviar imagen por WhatsApp:", err.response?.data || err.message);
  }
}

// Iniciar servidor
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Servidor escuchando en ${port}`));