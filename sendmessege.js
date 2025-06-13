const express = require('express');
const axios = require('axios');
const router = express.Router();

// Normalizar el número de teléfono a solo dígitos (formato E.164)
function normalizarTelefono(telefono) {
  return telefono.replace(/\D/g, '');
}

router.post('/send-whatsapp', async (req, res) => {
  const { telefono, mensaje } = req.body;

  // Validación básica
  if (!telefono || !mensaje) {
    return res.status(400).json({ success: false, error: 'Faltan el teléfono o el mensaje.' });
  }

  const numero = normalizarTelefono(telefono);

  try {
    const response = await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: '18096690177', // Número del remitente (de Gupshup)
        destination: numero,
        message: JSON.stringify({ type: 'text', text: mensaje }),
        'src.name': 'ConstructoraBisono',
      }),
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': process.env.GUPSHUP_APIKEY, // Usa la clave desde .env
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error('Error enviando mensaje:', errorData);
    res.status(500).json({ success: false, error: errorData });
  }
});

module.exports = router;
