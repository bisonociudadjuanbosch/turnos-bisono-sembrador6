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
  telefono: { type: String, required: true },
  etapa: { type: String, required: true, default: "Pendiente" },
  // Puedes agregar más campos según necesidades, como fecha, nombre, etc.
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

// Cambiar etapa de un turno
app.post("/cambiar-etapa", async (req, res) => {
  try {
    const { numero, nuevaEtapa } = req.body;
    if (!numero || !nuevaEtapa) return res.status(400).json({ error: "Faltan datos" });

    const turno = await Turno.findOne({ numero });
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    turno.etapa = nuevaEtapa;
    await turno.save();
    console.log(`✅ Turno ${numero} → ${nuevaEtapa}`);

    // Notificar siguiente pendiente (por fecha de creación)
    const siguiente = await Turno.findOne({ etapa: "Pendiente", _id: { $ne: turno._id } }).sort({ createdAt: 1 });
    if (siguiente) {
      try {
        await enviarWhatsApp(siguiente.telefono);
        console.log(`📲 Notificado a ${siguiente.telefono}`);
      } catch (e) {
        console.error("❌ Error al notificar:", e.response?.data || e.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

// Agregar un nuevo turno (recomendado)
app.post("/turnos", async (req, res) => {
  try {
    const { numero, telefono } = req.body;
    if (!numero || !telefono) return res.status(400).json({ error: "Faltan datos" });

    // Validar que no exista el turno con mismo número
    const existe = await Turno.findOne({ numero });
    if (existe) return res.status(409).json({ error: "Turno ya existe" });

    const nuevoTurno = new Turno({ numero, telefono });
    await nuevoTurno.save();
    res.status(201).json(nuevoTurno);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear turno" });
  }
});

// Subir imagen ticket
app.post("/subir-imagen", async (req, res) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return res.status(400).json({ error: "Falta campo 'imagen'" });

    const base64 = imagen.replace(/^data:image\/\w+;base64,/, "");
    const filename = `turno_${crypto.randomUUID()}.jpg`;
    const filepath = path.join(TICKETS_DIR, filename);

    await fs.promises.writeFile(filepath, base64, "base64");

    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Error al guardar imagen:", err);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// Función para enviar WhatsApp usando 360dialog
async function enviarWhatsApp(telefono) {
  if (!telefono) throw new Error("Teléfono vacío");
  const telFormateado = telefono.replace(/\D/g, "");
  const token = process.env.WHATSAPP_API_KEY;
  if (!token) throw new Error("Falta WHATSAPP_API_KEY en .env");

  try {
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
  } catch (error) {
    console.error("Error en enviarWhatsApp:", error.response?.data || error.message);
    throw error;
  }
}
const { enviarWhatsApp } = require("./gupshup");

app.post("/cambiar-etapa", async (req, res) => {
  // ...
  try {
    await enviarWhatsApp(siguiente.telefono, "¡Hola! es tu turno...");
    // ...
  } catch (err) {
    // manejo de error
  }
  // ...
});

// --- Inicio del servidor ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
