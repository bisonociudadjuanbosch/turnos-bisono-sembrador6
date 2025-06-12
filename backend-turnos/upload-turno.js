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

// Carpeta donde se guardan las imágenes
const TURNOS_FOLDER = path.join(__dirname, "turnos");
if (!fs.existsSync(TURNOS_FOLDER)) {
  fs.mkdirSync(TURNOS_FOLDER, { recursive: true });
}

// Base de datos en memoria (para pruebas)
let turnos = [];

/**
 * GET /turnos - Lista todos los turnos
 */
app.get("/turnos", (req, res) => res.json(turnos));

/**
 * POST /agregar-turno - Crea un nuevo turno
 */
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

/**
 * POST /cambiar-etapa - Cambia el estado del turno y avisa al siguiente
 */
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const idx = turnos.findIndex(t => t.numero === numero);
  if (idx < 0) return res.status(404).json({ error: "Turno no encontrado" });

  turnos[idx].etapa = nuevaEtapa;
  console.log(`✅ Turno ${numero} → ${nuevaEtapa}`);

  // Buscar el siguiente en espera
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

/**
 * Función para enviar mensaje de WhatsApp usando Gupshup API
 */
async function enviarWhatsApp(telefono) {
  const token = process.env.GUPSHUP_API_KEY;
  const from = process.env.GUPSHUP_SOURCE_NUMBER || "18096690177";
  const appName = process.env.GUPSHUP_APP_NAME || "ConstructoraBisono";

  const payload = new URLSearchParams();
  payload.append("channel", "whatsapp");
  payload.append("source", from);
  payload.append("destination", telefono);
  payload.append("message", JSON.stringify({
    type: "text",
    text: "¡Hola! Es tu turno. Acércate a nuestro Oficial de Ventas Bisonó."
  }));
  payload.append("src.name", appName);

  await axios.post("https://api.gupshup.io/sm/api/v1/msg", payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": token
    }
  });
}

/**
 * POST /subir-imagen - Guarda una imagen en base64 y devuelve la URL pública
 */
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

/**
 * Servir imágenes desde la carpeta /turnos
 */
app.use("/turnos", express.static(TURNOS_FOLDER));

// Iniciar el servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
);
