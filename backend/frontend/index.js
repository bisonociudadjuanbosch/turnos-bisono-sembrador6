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
    const { telefono } = req.body;
    if (!telefono) return res.status(400).json({ error: "Falta el número de teléfono" });

    // Buscar último turno generado
    const ultimoTurno = await Turno.findOne().sort({ createdAt: -1 });

    let nuevoNumero = "T-0001";
    if (ultimoTurno) {
      const ultimoNumero = parseInt(ultimoTurno.numero.replace("T-", ""), 10);
      const siguienteNumero = (ultimoNumero + 1).toString().padStart(4, "0");
      nuevoNumero = `T-${siguienteNumero}`;
    }

    const nuevoTurno = new Turno({ numero: nuevoNumero, telefono });
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

const multer = require("multer");
const upload = multer({ dest: "tickets/" });

app.post("/enviar-imagen-whatsapp", upload.single("imagen"), async (req, res) => {
  const { nombre, telefono } = req.body;
  const filePath = req.file.path;

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    const params = new URLSearchParams({
      channel: "whatsapp",
      source: "18096690177",
      destination: telefono,
      "src.name": "ConstructoraBisono",
      message: JSON.stringify({
        type: "image",
        originalUrl: `data:image/jpeg;base64,${base64Image}`,
        previewUrl: `data:image/jpeg;base64,${base64Image}`,
        caption: `Hola ${nombre}, aquí está tu turno generado. Te esperamos en Constructora Bisonó.`
      })
    });

    const response = await axios.post("https://api.gupshup.io/wa/api/v1/msg", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": "mqlyqhzffbgosadyap1vz6qpt8qzltku"
      }
    });

    res.json({ status: "ok", gupshup: response.data });
  } catch (error) {
    console.error("Error al enviar imagen:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudo enviar la imagen por WhatsApp" });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// --- Inicio del servidor ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
