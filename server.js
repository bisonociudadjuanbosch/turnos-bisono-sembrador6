// server.js - Backend consolidado y corregido para Turnos Bisonó
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const TURNOS_FILE = path.join(__dirname, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const CARPETA_IMAGENES = path.join(PUBLIC_DIR, "turnos");

// Crear carpeta de imágenes si no existe
if (!fs.existsSync(CARPETA_IMAGENES)) fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servir archivos estáticos del frontend
app.use(express.static(PUBLIC_DIR));

// Servir imágenes de tickets
app.use("/turnos", express.static(CARPETA_IMAGENES));

// Cargar turnos desde archivo (persistencia)
let turnos = [];
if (fs.existsSync(TURNOS_FILE)) {
  turnos = JSON.parse(fs.readFileSync(TURNOS_FILE));
}

function guardarTurnos() {
  fs.writeFileSync(TURNOS_FILE, JSON.stringify(turnos, null, 2));
}

// ENDPOINT: Obtener todos los turnos
app.get("/turnos", (req, res) => {
  res.json({ resultados: turnos });
});

// ENDPOINT: Agregar nuevo turno
app.post("/agregar-turno", (req, res) => {
  const { numero, telefono, nombre } = req.body;
  if (!numero || !telefono || !nombre) return res.status(400).json({ error: "Faltan datos" });

  const nuevoTurno = { numero, telefono, nombre, etapa: "Pendiente" };
  turnos.push(nuevoTurno);
  guardarTurnos();
  res.json(nuevoTurno);
});

// ENDPOINT: Cambiar estado del turno
app.post("/cambiar-etapa", (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const turno = turnos.find(t => t.numero === numero);
  if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

  turno.etapa = nuevaEtapa;
  guardarTurnos();
  res.json({ mensaje: "Etapa actualizada", turno });
});

// ENDPOINT: Subir imagen base64 y devolver URL
app.post("/subir-imagen", (req, res) => {
  const { base64, nombreArchivo } = req.body;
  if (!base64 || !nombreArchivo) return res.status(400).json({ error: "Faltan datos" });

  const data = base64.replace(/^data:image\/jpeg;base64,/, "");
  const ruta = path.join(CARPETA_IMAGENES, nombreArchivo);
  fs.writeFileSync(ruta, data, "base64");
  const url = `${req.protocol}://${req.get("host")}/turnos/${nombreArchivo}`;
  res.json({ url });
});

// ENDPOINT: Enviar mensaje de WhatsApp (texto plano)
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;
  if (!numeroTelefono || !mensaje) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_APIKEY
      },
      params: {
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE,
        destination: numeroTelefono,
        message: JSON.stringify({ type: "text", text: mensaje }),
        "src.name": process.env.GUPSHUP_SRC_NAME
      }
    });

    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("Error enviando WhatsApp:", err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// INICIAR SERVIDOR
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));