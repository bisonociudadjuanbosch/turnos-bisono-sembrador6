const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON y permitir CORS
app.use(express.json());
app.use(cors());

// Datos de tu cuenta Gupshup
const NUMERO_ORIGEN = "18096690177";
const APP_ID = "957b8460..."; // completa con tu app id real
const API_KEY = "sk_33ed3140aca24e4c98cd75b52b5c7722";

// Endpoint para enviar WhatsApp
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, mensaje } = req.body;

  if (!numeroTelefono || !mensaje) {
    return res.status(400).json({ error: "Faltan parámetros: numeroTelefono y mensaje son requeridos" });
  }

  try {
    const params = new URLSearchParams();
    params.append("channel", "whatsapp");
    params.append("source", NUMERO_ORIGEN);
    params.append("destination", numeroTelefono);
    params.append("message", JSON.stringify({ type: "text", text: mensaje }));
    params.append("src.name", APP_ID);

    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": API_KEY,
      },
    });

    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error enviando WhatsApp:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error al enviar mensaje vía Gupshup" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
