// enviarWhatsApp.js
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

/**
 * Envía un mensaje (texto o imagen) por WhatsApp usando Gupshup
 * @param {string} telefono - Número destino (en formato internacional sin +)
 * @param {object} message - Objeto con la estructura según tipo:
 *    { type: 'text', text: '...' }
 *    { type: 'image', originalUrl:'...', previewUrl:'...', caption:'...' }
 */
async function enviarWhatsApp(telefono, message) {
  const { GUPSHUP_APIKEY, GUPSHUP_SOURCE, GUPSHUP_SRC_NAME } = process.env;

  try {
    const form = new FormData();
    form.append('channel', 'whatsapp');
    form.append('source', GUPSHUP_SOURCE);
    form.append('destination', telefono);
    form.append('src.name', GUPSHUP_SRC_NAME);
    form.append('message', JSON.stringify(message));  // evitar message.payload :contentReference[oaicite:1]{index=1}

    const resp = await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      form,
      { headers: { ...form.getHeaders(), apikey: GUPSHUP_APIKEY } }
    );

    console.log('✅ WhatsApp enviado:', resp.data);
    return resp.data;
  } catch (err) {
    console.error('❌ Error enviando WhatsApp:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = enviarWhatsApp;
