const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Base de datos temporal en memoria
let turnos = [
  { numero: "001", estado: "Pendiente", telefono: "18091234567" },
  { numero: "002", estado: "Pendiente", telefono: "18097654321" },
  // Puedes añadir más turnos
];

// Cambiar estado y notificar al siguiente turno
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const index = turnos.findIndex((t) => t.numero === numero);

  if (index === -1) {
    return res.status(404).json({ error: "Turno no encontrado" });
  }

  turnos[index].estado = nuevaEtapa;
  console.log(`✅ Turno ${numero} cambiado a etapa: ${nuevaEtapa}`);

  // Notificar al siguiente turno si existe
  const siguienteTurno = turnos.find(
    (t, i) => i > index && t.estado === "Pendiente"
  );

  if (siguienteTurno) {
    try {
      await enviarWhatsApp(siguienteTurno.telefono);
      console.log(`📲 WhatsApp enviado a turno ${siguienteTurno.numero}`);
    } catch (err) {
      console.error("❌ Error enviando WhatsApp:", err.response?.data || err.message);
    }
  }

  res.json({ success: true });
});

// Enviar mensaje de WhatsApp usando API oficial
async function enviarWhatsApp(telefono) {
  const token = "sk_33ed3140aca24e4c98cd75b52b5c7722";
  const appId = "957b8460...";
  const wabaId = "508852171945366";
  const numeroTelefono = telefono.replace(/[^0-9]/g, "");

  await axios.post(
    `https://api.360dialog.io/v1/messages`,
    {
      to: `+${numeroTelefono}`,
      type: "text",
      text: { body: "¡Hola! es tu Turno, por favor acercate a nuestro Oficial de Ventas Bisonó." }
    },
    {
      headers: {
        "Content-Type": "application/json",
        "D360-API-KEY": token
      }
    }
  );
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
