// server.js - Backend actualizado con MongoDB para Turnos Bisonó
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");

const Turno = require("./models/Turno");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const CARPETA_IMAGENES = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(CARPETA_IMAGENES)) fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(CARPETA_IMAGENES));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error de conexión a MongoDB:", err));

app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

// ENDPOINT: Obtener todos los turnos
app.get("/turnos", async (req, res) => {
  const resultados = await Turno.find().sort({ createdAt: -1 });
  res.json({ resultados });
});

// ENDPOINT: Agregar nuevo turno
app.post("/agregar-turno", async (req, res) => {
  const { numero, telefono, nombre } = req.body;
  if (!numero || !telefono || !nombre) return res.status(400).json({ error: "Faltan datos" });

  const nuevoTurno = await Turno.create({ numero, telefono, nombre });
  res.json(nuevoTurno);
});

// ENDPOINT: Cambiar estado del turno
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const turno = await Turno.findOneAndUpdate({ numero }, { etapa: nuevaEtapa }, { new: true });
  if (!turno) return res.status(404).json({ error: "Turno no encontrado" });
  res.json({ mensaje: "Etapa actualizada", turno });
});

// ENDPOINT: Subir imagen base64
app.post("/subir-imagen", (req, res) => {
  const { base64, nombreArchivo } = req.body;
  if (!base64 || !nombreArchivo) return res.status(400).json({ error: "Faltan datos" });

  const data = base64.replace(/^data:image\/jpeg;base64,/, "");
  const ruta = path.join(CARPETA_IMAGENES, nombreArchivo);
  fs.writeFileSync(ruta, data, "base64");
  const url = `${req.protocol}://${req.get("host")}/turnos/${nombreArchivo}`;
  res.json({ url });
});

// ENDPOINT: Enviar mensaje WhatsApp (plantilla con imagen)
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, plantillaId, nombreCliente, imagenUrl } = req.body;
  if (!numeroTelefono || !plantillaId || !nombreCliente || !imagenUrl) {
    return res.status(400).json({ error: "Datos incompletos para la plantilla" });
  }

  try {
    const response = await axios.post("https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE,
        destination: numeroTelefono,
        "src.name": process.env.GUPSHUP_SRC_NAME,
        template: JSON.stringify({
          id: plantillaId,
          params: [nombreCliente]
        }),
        message: JSON.stringify({
          type: "image",
          image: { link: imagenUrl }
        })
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": process.env.GUPSHUP_APIKEY
        }
      }
    );

    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("Error enviando WhatsApp:", err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// INICIAR SERVIDOR
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));