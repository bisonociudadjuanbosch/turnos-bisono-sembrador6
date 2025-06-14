const express = require("express");
const axios = require("axios");
const router = express.Router();

// ✅ Normalizar teléfono al formato E.164 sin espacios, guiones ni símbolos
function normalizarTelefono(telefono) {
  return telefono.replace(/\D/g, '');
}

router.post("/send-whatsapp", async (req, res) => {
  const { telefono, mensaje } = req.body;

  // 🔒 Validación básica
  if (!telefono || !mensaje) {
    return res.status(400).json({ success: false, error: "Faltan el teléfono o el mensaje." });
  }

  const numero = normalizarTelefono(telefono);

  try {
    const params = new URLSearchParams({
      channel: "whatsapp",
      source: process.env.WABA_PHONE || "18096690177", // tu número WABA
      destination: numero,
      message: JSON.stringify({ type: "text", text: mensaje }),
      "src.name": process.env.APP_NAME || "ConstructoraBisono"
    });

    const response = await axios.post(
      "https://api.gupshup.io/sm/api/v1/msg", // 🟢 Esta es la versión moderna y estable
      params,
      {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_APIKEY || "sk_33ed3140aca24e4c98cd75b52b5c7722",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error("❌ Error enviando mensaje:", errorData);
    res.status(500).json({ success: false, error: errorData });
  }
});

module.exports = router;
