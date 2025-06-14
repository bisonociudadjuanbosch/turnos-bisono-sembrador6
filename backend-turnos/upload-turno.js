require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/turnos-bisono";
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("🗄️ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// Esquema y modelo de turno
const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  telefono: { type: String, required: true },
  etapa: { type: String, default: "Pendiente" },
  creadoEn: { type: Date, default: Date.now }
});

const Turno = mongoose.model("Turno", turnoSchema);

// Carpeta para imágenes
const TURNOS_FOLDER = path.join(__dirname, "turnos");
if (!fs.existsSync(TURNOS_FOLDER)) {
  fs.mkdirSync(TURNOS_FOLDER, { recursive: true });
}

// Rutas

// GET /turnos - Listar todos ordenados por fecha creación ascendente
app.get("/turnos", async (req, res) => {
  try {
    const turnos = await Turno.find().sort({ creadoEn: 1 }).exec();
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener turnos" });
  }
});

// POST /agregar-turno - Crear nuevo turno
app.post("/agregar-turno", async (req, res) => {
  try {
    const { numero, telefono, etapa = "Pendiente" } = req.body;

    if (!numero || !telefono) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Validar que no exista ya el turno
    const existe = await Turno.findOne({ numero }).exec();
    if (existe) {
      return res.status(409).json({ error: "Turno ya existe" });
    }

    const nuevoTurno = new Turno({ numero, telefono, etapa });
    await nuevoTurno.save();

    res.json({ success: true, turno: nuevoTurno });
  } catch (error) {
    console.error("❌ Error agregando turno:", error);
    res.status(500).json({ error: "Error al crear turno" });
  }
});

// POST /cambiar-etapa - Cambiar estado de un turno y avisar al siguiente
app.post("/cambiar-etapa", async (req, res) => {
  try {
    const { numero, nuevaEtapa } = req.body;
    if (!numero || !nuevaEtapa) {
      return res.status(400).json({ error: "Faltan campos 'numero' o 'nuevaEtapa'" });
    }

    const turno = await Turno.findOne({ numero }).exec();
    if (!turno) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    turno.etapa = nuevaEtapa;
    await turno.save();

    console.log(`✅ Turno ${numero} cambiado a ${nuevaEtapa}`);

    // Buscar siguiente turno pendiente más antiguo (creadoEn asc)
    const siguiente = await Turno.findOne({ etapa: "Pendiente", numero: { $ne: numero } })
      .sort({ creadoEn: 1 })
      .exec();

    if (siguiente) {
      try {
        await enviarWhatsApp(siguiente.telefono);
        console.log(`📲 WhatsApp enviado a ${siguiente.telefono}`);
      } catch (e) {
        console.error("❌ Error enviando WhatsApp:", e.response?.data || e.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error cambiando etapa:", error);
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

// POST /subir-imagen - Igual que antes
app.post("/subir-imagen", (req, res) => {
  const { imagen } = req.body;

  if (!imagen || typeof imagen !== "string" || !imagen.startsWith("data:image/")) {
    return res.status(400).json({ error: "Imagen inválida o faltante" });
  }

  const extension = imagen.substring("data:image/".length, imagen.indexOf(";base64"));
  const base64Data = imagen.split(";base64,").pop();
  const filename = `turno_${Date.now()}.${extension}`;
  const filePath = path.join(TURNOS_FOLDER, filename);

  fs.writeFile(filePath, base64Data, "base64", err => {
    if (err) {
      console.error("❌ Error al guardar imagen:", err);
      return res.status(500).json({ error: "No se pudo guardar la imagen" });
    }

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  });
});

// POST /enviar-turno - Guardar imagen y enviar WhatsApp
app.post("/enviar-turno", (req, res) => {
  const { telefono, imagen } = req.body;

  if (!telefono || !imagen || !imagen.startsWith("data:image/")) {
    return res.status(400).json({ error: "Faltan datos válidos: teléfono o imagen" });
  }

  const extension = imagen.substring("data:image/".length, imagen.indexOf(";base64"));
  const base64Data = imagen.split(";base64,").pop();
  const filename = `turno_${Date.now()}.${extension}`;
  const filePath = path.join(TURNOS_FOLDER, filename);

  fs.writeFile(filePath, base64Data, "base64", async err => {
    if (err) {
      console.error("❌ Error al guardar imagen:", err);
      return res.status(500).json({ error: "No se pudo guardar la imagen" });
    }

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    try {
      await enviarWhatsApp(telefono, url);
      res.json({ success: true, url });
    } catch (e) {
      console.error("❌ Error al enviar WhatsApp:", e.response?.data || e.message);
      res.status(500).json({ error: "No se pudo enviar WhatsApp" });
    }
  });
});

// Servir imágenes desde /turnos
app.use("/turnos", express.static(TURNOS_FOLDER));

// Enviar WhatsApp (igual que antes)
async function enviarWhatsApp(telefono, imageUrl = null) {
  const token = process.env.GUPSHUP_API_KEY;
  if (!token) throw new Error("Falta API key de Gupshup");

  const from = process.env.GUPSHUP_SOURCE_NUMBER || "18096690177";
  const appName = process.env.GUPSHUP_APP_NAME || "ConstructoraBisono";

  let telLimpio = telefono.replace(/\D/g, "");
  if (!telLimpio.startsWith("1")) {
    telLimpio = "1" + telLimpio;
  }

  let messagePayload;
  if (imageUrl) {
    messagePayload = {
      type: "image",
      originalUrl: imageUrl,
      previewUrl: imageUrl,
      caption: "Aquí tienes tu turno en Constructora Bisonó"
    };
  } else {
    messagePayload = {
      type: "text",
      text: "¡Hola! Es tu turno. Acércate a nuestro Oficial de Ventas Bisonó."
    };
  }

  const payload = new URLSearchParams();
  payload.append("channel", "whatsapp");
  payload.append("source", from);
  payload.append("destination", telLimpio);
  payload.append("message", JSON.stringify(messagePayload));
  payload.append("src.name", appName);

  await axios.post("https://api.gupshup.io/sm/api/v1/msg", payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: token
    }
  });
}

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
