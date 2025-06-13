// gupshup.js
const axios = require("axios");

const apiKey = process.env.GUPSHUP_API_KEY;
const source = process.env.GUPSHUP_SOURCE_NUMBER;
const appName = process.env.GUPSHUP_APP_NAME;

async function enviarWhatsApp(numeroTelefono, mensaje) {
  if (!apiKey || !source || !appName) {
    throw new Error("Faltan variables de entorno para Gupshup (API Key, Source, AppName)");
  }
  if (!numeroTelefono || !mensaje) {
    throw new Error("Número de teléfono y mensaje son obligatorios");
  }

  try {
    const params = {
      channel: "whatsapp",
      source: source,
      destination: numeroTelefono,
      message: JSON.stringify({ type: "text", text: mensaje }),
      "src.name": appName,
    };

    const response = await axios.post(
      "https://api.gupshup.io/sm/api/v1/msg",
      null,
      {
        params,
        headers: {
          apikey: apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error enviando WhatsApp:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { enviarWhatsApp };
