// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();

// 1. Parser con límite alto para imágenes en base64
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 2. Carpeta para guardar imágenes (tickets)
const TICKETS_DIR = path.join(__dirname, "turnos");
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR);
app.use("/turnos", express.static(TICKETS_DIR));

// Base de datos temporal (puedes reemplazar por JSON o Mongo más adelante)
let turnos = [];

// 3. Endpoint GET /turnos para obtener la lista
app.get("/turnos", (req, res) => {
  res.json(turnos);
});

// 4. Endpoint POST /cambiar-etapa
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const idx = turnos.findIndex(t => t.numero === numero);
  if (idx < 0) return res.status(404).json({ error: "Turno no encontrado" });

  turnos[idx].etapa = nuevaEtapa;
  console.log(`✅ Turno ${numero} → ${nuevaEtapa}`);

  // Notificar al siguiente pendiente
  const siguiente = turnos.find((t, i) => i > idx && t.etapa === "Pendiente");
  if (siguiente) {
    try {
      await enviarWhatsApp(siguiente.telefono);
      console.log(`📲 Notificado a ${siguiente.telefono}`);
    } catch (e) {
      console.error("❌ Error al notificar:", e.response?.data || e.message);
    }
  }

  res.json({ success: true });
});

// 5. Enviar WhatsApp usando 360dialog
async function enviarWhatsApp(telefono) {
  const token = process.env.WHATSAPP_API_KEY;
  await axios.post("https://api.360dialog.io/v1/messages", {
    to: `+${telefono.replace(/\D/g, "")}`,
    type: "text",
    text: { body: "¡Hola! es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó." }
  }, {
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": token
    }
  });
}

// 6. Subir imagen (ticket del cliente) y devolver URL pública
app.post("/subir-imagen", (req, res) => {
  const { imagen } = req.body;
  if (!imagen) return res.status(400).json({ error: "Falta campo 'imagen'" });

  const base64 = imagen.replace(/^data:image\/\w+;base64,/, "");
  const filename = `turno_${Date.now()}.jpg`;
  const filepath = path.join(TICKETS_DIR, filename);

  fs.writeFile(filepath, base64, "base64", err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al guardar imagen" });
    }
    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  });
});

// 7. Puerto de ejecución (ajusa disco en Render automáticamente)
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
