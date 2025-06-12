// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const Turno = require("./models/Turno");

const app = express();
const port = parseInt(process.env.PORT, 10) || 10000;
const host = "0.0.0.0";

// Directorios públicos e imágenes
const PUBLIC_DIR = path.join(__dirname, "public");
const IMG_DIR = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(IMG_DIR));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error de conexión a MongoDB:", err));

// Rutas
app.get("/", (req, res) => res.send("✅ Servicio en línea"));
app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/turnos", async (req, res) => {
  try {
    const turnos = await Turno.find().sort({ createdAt: -1 });
    res.json({ turnos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/agregar-turno", async (req, res) => {
  const { numero, telefono, nombre } = req.body;
  if (!numero || !telefono || !nombre) return res.status(400).json({ error: "Faltan datos" });

  try {
    const nuevoTurno = await Turno.create({ numero, telefono, nombre });
    res.json(nuevoTurno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  try {
    const turno = await Turno.findOneAndUpdate({ numero }, { etapa: nuevaEtapa }, { new: true });
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });
    res.json({ mensaje: "Etapa actualizada", turno });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/subir-imagen", (req, res) => {
  const { base64, nombreArchivo } = req.body;
  if (!base64 || !nombreArchivo) return res.status(400).json({ error: "Faltan datos" });

  try {
    const data = base64.replace(/^data:image\/jpeg;base64,/, "");
    const ruta = path.join(IMG_DIR, nombreArchivo);
    fs.writeFileSync(ruta, data, "base64");
    const url = `${req.protocol}://${req.get("host")}/turnos/${nombreArchivo}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, plantillaId, nombreCliente, imagenUrl } = req.body;
  if (![numeroTelefono, plantillaId, nombreCliente, imagenUrl].every(Boolean)) {
    return res.status(400).json({ error: "Datos incompletos para la plantilla" });
  }

  try {
    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE,
        destination: numeroTelefono,
        "src.name": process.env.GUPSHUP_SRC_NAME,
        template: JSON.stringify({ id: plantillaId, params: [nombreCliente] }),
        message: JSON.stringify({ type: "image", image: { link: imagenUrl } })
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", "apikey": process.env.GUPSHUP_APIKEY } }
    );
    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("Error enviando WhatsApp:", err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

app.post("/reiniciar-turnos", async (req, res) => {
  try {
    await Turno.deleteMany({});
    res.json({ mensaje: "Todos los turnos han sido eliminados para reiniciar el conteo diario." });
  } catch (err) {
    console.error("Error reiniciando turnos:", err.message);
    res.status(500).json({ error: "Error al reiniciar los turnos." });
  }
});

// Iniciar servidor
app.listen(port, host, () => {
  console.log(`Servidor corriendo en http://${host}:${port}`);
});
