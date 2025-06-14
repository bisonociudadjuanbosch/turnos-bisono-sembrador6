// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();

// --- Configuración ---
const TICKETS_DIR = path.join(__dirname, "turnos");
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servir imágenes de tickets
app.use("/turnos", express.static(TICKETS_DIR));

// --- Conectar MongoDB ---
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://bisonociudadjuanbosch:Bisono123@cluster0.xjit6wb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB"))
.catch(err => {
  console.error("❌ Error conexión MongoDB:", err);
  process.exit(1);
});

// --- Definir esquema y modelo ---
const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  nombre: { type: String, default: "" }, // Opcional
  telefono: { type: String, required: true },
  etapa: { type: String, required: true, default: "Pendiente" },
}, { timestamps: true });

const Turno = mongoose.model("Turno", turnoSchema);

// --- Endpoints ---

// Obtener todos los turnos
app.get("/turnos", async (req, res) => {
  try {
    const turnos = await Turno.find().sort({ createdAt: 1 });
    res.json(turnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener turnos" });
  }
});

// Cambiar etapa de un turno y notificar siguiente pendiente
app.post("/cambiar-etapa", async (req, res) => {
  try {
    const { numero, nuevaEtapa } = req.body;
    if (!numero || !nuevaEtapa) return res.status(400).json({ error: "Faltan datos" });

    const turno = await Turno.findOne({ numero });
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    turno.etapa = nuevaEtapa;
    await turno.save();
    console.log(`✅ Turno ${numero} → ${nuevaEtapa}`);

    // Notificar siguiente turno pendiente
    const siguiente = await Turno.findOne({ etapa: "Pendiente", _id: { $ne: turno._id } }).sort({ createdAt: 1 });
    if (siguiente) {
      try {
        await enviarWhatsApp(siguiente.telefono);
        console.log(`📲 Notificado a ${siguiente.telefono}`);
      } catch (e) {
        console.error("❌ Error al notificar siguiente turno:", e.response?.data || e.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

// Crear un nuevo turno
app.post("/turnos", async (req, res) => {
  try {
    const { telefono, nombre } = req.body;
    if (!telefono) return res.status(400).json({ error: "Falta el número de teléfono" });

    // Generar nuevo número incremental T-0001, T-0002, ...
    const ultimoTurno = await Turno.findOne().sort({ createdAt: -1 });
    let nuevoNumero = "T-0001";
    if (ultimoTurno) {
      const ultimoNum = parseInt(ultimoTurno.numero.replace("T-", ""), 10);
      const siguienteNum = (ultimoNum + 1).toString().padStart(4, "0");
      nuevoNumero = `T-${siguienteNum}`;
    }

    const nuevoTurno = new Turno({ numero: nuevoNumero, telefono, nombre: nombre || "" });
    await nuevoTurno.save();

    res.status(201).json(nuevoTurno);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear turno" });
  }
});

// Subir imagen ticket en base64
app.post("/subir-imagen", async (req, res) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return res.status(400).json({ error: "Falta campo 'imagen'" });

    const base64Data = imagen.replace(/^data:image\/\w+;base64,/, "");
    const filename = `turno_${crypto.randomUUID()}.jpg`;
    const filepath = path.join(TICKETS_DIR, filename);

    await fs.promises.writeFile(filepath, base64Data, "base64");

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Error al guardar imagen:", err);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// Enviar WhatsApp automático al cambiar etapa
async function enviarWhatsApp(telefono) {
  if (!telefono) throw new Error("Teléfono vacío");
  const telFormateado = telefono.replace(/\D/g, "");
  const token = process.env.WHATSAPP_API_KEY;
  if (!token) throw new Error("Falta WHATSAPP_API_KEY en .env");

  await axios.post("https://api.360dialog.io/v1/messages", {
    to: `+${telFormateado}`,
    type: "text",
    text: { body: "¡Hola! es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó." }
  }, {
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": token
    }
  });
}

// Endpoint para enviar WhatsApp manualmente con mensaje personalizado
app.post("/enviar-turno", async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;
    if (!telefono || !mensaje) return res.status(400).json({ error: "Faltan datos" });

    await enviarWhatsAppPersonalizado(telefono, mensaje);

    res.json({ success: true });
  } catch (err) {
    console.error("Error enviar-turno:", err);
    res.status(500).json({ error: "Error al enviar WhatsApp" });
  }
});

// Función para enviar WhatsApp con mensaje personalizado
async function enviarWhatsAppPersonalizado(telefono, mensaje) {
  if (!telefono) throw new Error("Teléfono vacío");
  const telFormateado = telefono.replace(/\D/g, "");
  const token = process.env.WHATSAPP_API_KEY;
  if (!token) throw new Error("Falta WHATSAPP_API_KEY en .env");

  await axios.post("https://api.360dialog.io/v1/messages", {
    to: `+${telFormateado}`,
    type: "text",
    text: { body: mensaje }
  }, {
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": token
    }
  });
}

// --- Iniciar servidor ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
