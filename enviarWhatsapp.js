/const axios = require('axios');

async function enviarMensajeWhatsapp(telefono, mensaje) {
  const APIKEY = process.env.GUPSHUP_APIKEY;
  const SOURCE = process.env.GUPSHUP_SOURCE;
  const SRC_NAME = process.env.GUPSHUP_SRC_NAME;

  try {
    const res = await axios.post(
      'https://api.gupshup.io/sm/api/v1/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: SOURCE,
        destination: telefono,
        message: JSON.stringify({ type: 'text', text: mensaje }),
        'src.name': SRC_NAME
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apikey: APIKEY,
        }
      }
    );
    console.log(`📨 Mensaje enviado a ${telefono}`);
  } catch (err) {
    console.error('❌ Error enviando mensaje WhatsApp:', err.response?.data || err.message);
  }
}

module.exports = enviarMensajeWhatsapp;
