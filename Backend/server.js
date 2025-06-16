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

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/tickets", express.static(path.join(__dirname, "tickets")));

// Hacer pública la carpeta de tickets
const TICKETS_DIR = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR);
app.use("/tickets", express.static(TICKETS_DIR));

const port = process.env.PORT || 10000;
const mongodbUri = process.env.MONGODB_URI;

// 📦 Conexión a MongoDB
mongoose.connect(mongodbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error conexión MongoDB:", err));

// 📥 POST /turnos
app.post("/turnos", async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!telefono) return res.status(400).json({ error: "El teléfono es obligatorio" });

  try {
    const ultimoTurno = await Turno.findOne().sort({ numeroTurno: -1 });
    const nuevoNumero = ultimoTurno ? ultimoTurno.numeroTurno + 1 : 1;

    const nuevoTurno = new Turno({
      nombre,
      telefono,
      numeroTurno: nuevoNumero
    });
    await nuevoTurno.save();

    const enEspera = await Turno.countDocuments({ estado: { $in: ["Pendiente", "En Proceso"] } });

    const filePath = await generarTicketVisual({
      nombre,
      numeroTurno: nuevoNumero,
      fecha: nuevoTurno.fecha,
      enEspera
    });
    const uploadTurno = require("./upload-turno");
    app.use("/", uploadTurno);
    
    await enviarImagenWhatsApp(telefono, filePath);

    res.json({
      numeroTurno: nuevoNumero,
      enEspera,
      imagenUrl: `${req.protocol}://${req.get("host")}/tickets/${path.basename(filePath)}`
    });
  } catch (err) {
    console.error("❌ Error al generar turno:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// 🧾 Función para generar imagen visual del ticket
async function generarTicketVisual({ nombre, numeroTurno, fecha, enEspera }) {
  const width = 600;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px Arial";

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
    `Personas en espera: ${enEspera}`,
  ];

  lines.forEach((line, index) => {
    ctx.fillText(line, 40, 40 + index * 35);
  });

  const filePath = path.join(TICKETS_DIR, `turno_${numeroTurno}.jpg`);
  const out = fs.createWriteStream(filePath);
  const stream = canvas.createJPEGStream();
  stream.pipe(out);

  return new Promise((resolve, reject) => {
    out.on("finish", () => resolve(filePath));
    out.on("error", reject);
  });
}

// 📲 Enviar imagen por WhatsApp con Gupshup
async function enviarImagenWhatsApp(destino, filePath) {
  try {
    const publicUrl = `${process.env.APP_URL || "http://localhost:" + port}/tickets/${path.basename(filePath)}`;

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
      headers: {
        ...data.getHeaders(),
        apikey: process.env.GUPSHUP_APIKEY,
      },
    });

    console.log("📲 Ticket enviado a WhatsApp:", destino);
  } catch (err) {
    console.error("❌ Error al enviar imagen por WhatsApp:", err.response?.data || err.message);
  }
}

// 🟢 Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
