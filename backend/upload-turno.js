require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Crear carpeta turnos
const TURNOS_FOLDER = path.join(__dirname, "turnos");
if (!fs.existsSync(TURNOS_FOLDER)) {
  fs.mkdirSync(TURNOS_FOLDER, { recursive: true });
}

// Base de datos en memoria
let turnos = [];

// Obtener todos los turnos
app.get("/turnos", (req, res) => res.json(turnos));

// Agregar nuevo turno
app.post("/agregar-turno", (req, res) => {
  const { numero, telefono, etapa = "Pendiente" } = req.body;
  if (!numero || !telefono) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }
  if (turnos.find(t => t.numero === numero)) {
    return res.status(409).json({ error: "Turno ya existe" });
  }
  turnos.push({ numero, telefono, etapa });
  res.json({ success: true, turno: { numero, telefono, etapa } });
});

// Cambiar estado y notificar siguiente en pendiente
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const idx = turnos.findIndex(t => t.numero === numero);
  if (idx < 0) return res.status(404).json({ error: "Turno no encontrado" });

  turnos[idx].etapa = nuevaEtapa;
  console.log(`✅ Turno ${numero} → ${nuevaEtapa}`);

  const siguiente = turnos.find((t, i) => i > idx && t.etapa === "Pendiente");
  if (siguiente) {
    try {
      await enviarWhatsApp(siguiente.telefono);
      console.log(`📲 WhatsApp enviado a ${siguiente.telefono}`);
    } catch (e) {
      console.error("❌ Error enviando WhatsApp:", e.response?.data || e.message);
    }
  }

  res.json({ success: true });
});

// Función para enviar WhatsApp
async function enviarWhatsApp(telefono) {
  const token = process.env.WHATSAPP_API_KEY;
  await axios.post("https://api.360dialog.io/v1/messages", {
    to: `+${telefono.replace(/\D/g, "")}`,
    type: "text",
    text: {
      body: "¡Hola! es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó."
    }
  }, {
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": token
    }
  });
}

// Subir imagen base64 y devolver URL
app.post("/subir-imagen", (req, res) => {
  const { imagen } = req.body;
  if (!imagen) return res.status(400).json({ error: "Falta campo 'imagen'" });

  const base64 = imagen.replace(/^data:image\/\w+;base64,/, "");
  const filename = `turno_${Date.now()}.jpg`;
  const filePath = path.join(TURNOS_FOLDER, filename);

  fs.writeFile(filePath, base64, "base64", err => {
    if (err) return res.status(500).json({ error: "Error al guardar imagen" });
    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  });
});

// Servir imágenes
app.use("/turnos", express.static(TURNOS_FOLDER));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);
