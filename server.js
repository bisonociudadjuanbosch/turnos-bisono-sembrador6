require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Turno = require("./models/turno");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// 📂 Directorios
const PUBLIC_DIR = path.join(__dirname, "public");
const CARPETA_IMAGENES = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(CARPETA_IMAGENES)) fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });

// 🔧 Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(CARPETA_IMAGENES));

// 🛠️ Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/turnos", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB"))
.catch(err => console.error("❌ Error al conectar a MongoDB:", err.message));

// Health check rápido
app.get("/health", (req, res) => res.status(200).send("OK"));

// Ruta principal
app.get("/", (req, res) => res.send("🟢 API de Turnos Bisonó funcionando."));

// 📌 Crear nuevo turno
app.post("/turnos", async (req, res) => {
  try {
    const { numero, nombre, telefono, fechaHora } = req.body;

    if (!numero || !nombre || !telefono || !fechaHora) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const nuevo = await Turno.create({ numero, nombre, telefono, fechaHora });
    res.json(nuevo);
  } catch (err) {
    console.error("❌ Error al registrar turno:", err.message);
    res.status(500).json({ error: "Error al registrar turno" });
  }
});

// 📋 Obtener todos los turnos
app.get("/turnos", async (req, res) => {
  try {
    const resultados = await Turno.find().sort({ _id: 1 });
    res.json({ resultados });
  } catch (err) {
    console.error("❌ Error al obtener turnos:", err.message);
    res.status(500).json({ error: "Error al obtener turnos" });
  }
});

// 🔄 Cambiar etapa del turno y notificar al siguiente
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;

  if (!numero || !nuevaEtapa) {
    return res.status(400).json({ error: "Faltan datos para cambiar la etapa" });
  }

  try {
    const actualizado = await Turno.findOneAndUpdate(
      { numero },
      { etapa: nuevaEtapa },
      { new: true }
    );

    if (!actualizado) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    // 🟢 Notificar al siguiente turno pendiente
    const siguiente = await Turno.findOne({ etapa: "Pendiente" }).sort({ _id: 1 });
    if (siguiente) {
      await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_APIKEY,
        },
        params: {
          channel: "whatsapp",
          source: process.env.GUPSHUP_SOURCE,
          destination: siguiente.telefono,
          message: JSON.stringify({
            type: "text",
            text: "¡Hola! es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó."
          }),
          "src.name": process.env.GUPSHUP_SRC_NAME,
        }
      });
    }

    res.json(actualizado);
  } catch (err) {
    console.error("❌ Error cambiando etapa:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

// 🖼️ Subir imagen de turno
app.post("/upload-turno", async (req, res) => {
  const { image } = req.body;

  if (!image || !image.startsWith("data:image/jpeg;base64,")) {
    return res.status(400).json({ error: "Imagen no válida" });
  }

  try {
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
    const filename = `turno-${crypto.randomUUID()}.jpg`;
    const filePath = path.join(CARPETA_IMAGENES, filename);

    fs.writeFileSync(filePath, base64Data, "base64");

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("❌ Error al guardar imagen:", err.message);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// 📲 Enviar WhatsApp directamente
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;

  if (!numeroTelefono || !mensaje) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  try {
    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_APIKEY,
      },
      params: {
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE,
        destination: numeroTelefono,
        message: JSON.stringify({ type: "text", text: mensaje }),
        "src.name": process.env.GUPSHUP_SRC_NAME,
      }
    });

    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err.response?.data || err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// 🧪 Ruta de prueba
app.get("/", (req, res) => {
  res.send("🟢 API de Turnos Bisonó funcionando. Usa /turnos para obtener turnos.");
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
