require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const Turno = require("./models/turno"); // Asegúrate de tener el modelo definido correctamente

const app = express();
const PORT = process.env.PORT || 10000;

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

// 🩺 Health check
app.get("/health", (req, res) => res.send("🟢 API de Turnos Bisonó OK"));

// 🏠 Ruta raíz
app.get("/", (req, res) => {
  res.send("🟢 API de Turnos Bisonó funcionando. Usa /turnos para obtener turnos.");
});

// 📌 Crear nuevo turno
app.post("/turnos", async (req, res) => {
  try {
    const { numero, nombre, telefono, fechaHora } = req.body;
    if (!numero || !nombre || !telefono || !fechaHora) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const nuevo = await Turno.create({
      numero,
      nombre,
      telefono,
      fechaHora,
      etapa: "Pendiente"
    });

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

// 🔄 Cambiar etapa y notificar al siguiente turno pendiente
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
          apikey: process.env.GUPSHUP_APIKEY || "sk_33ed3140aca24e4c98cd75b52b5c7722",
        },
        params: {
          channel: "whatsapp",
          source: process.env.GUPSHUP_SOURCE || "18096690177",
          destination: siguiente.telefono,
          message: JSON.stringify({
            type: "text",
            text: "¡Hola! es tu Turno, por favor acercate a nuestro Oficial de Ventas Bisonó."
          }),
          "src.name": process.env.GUPSHUP_SRC_NAME || "ConstructoraBisono",
        }
      });
    }

    res.json(actualizado);
  } catch (err) {
    console.error("❌ Error cambiando etapa:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

// 🖼️ Subir imagen del ticket
app.post("/upload-turno", async (req, res) => {
  const { image } = req.body;

  if (!image || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Imagen no válida" });
  }

  try {
    const extension = image.split(";")[0].split("/")[1];
    const base64Data = image.split(";base64,").pop();
    const filename = `turno-${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(CARPETA_IMAGENES, filename);

    fs.writeFileSync(filePath, base64Data, "base64");

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("❌ Error al guardar imagen:", err.message);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// 📲 Enviar mensaje directo por WhatsApp
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;

  if (!numeroTelefono || !mensaje) {
    return res.status(400).json({ error: "Faltan datos para enviar el mensaje" });
  }

  try {
    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_APIKEY || "sk_33ed3140aca24e4c98cd75b52b5c7722",
      },
      params: {
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE || "18096690177",
        destination: numeroTelefono,
        message: JSON.stringify({ type: "text", text: mensaje }),
        "src.name": process.env.GUPSHUP_SRC_NAME || "ConstructoraBisono",
      }
    });

    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err.response?.data || err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
