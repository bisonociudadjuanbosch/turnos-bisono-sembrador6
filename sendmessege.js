// routes/sendWhatsapp.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/send-whatsapp', async (req, res) => {
  const { telefono, mensaje } = req.body;

  try {
    const response = await axios.post(
      'https://api.gupshup.io/wa/api/v1/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: '18096690177', // Remitente
        destination: telefono, // Número destino en formato internacional (ej. 18091234567)
        message: JSON.stringify({ type: 'text', text: mensaje }),
        'src.name': 'ConstructoraBisono',
      }),
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': 'mqlyqhzffbgosadyap1vz6qpt8qzltku', // o tu clave API secreta: sk_33ed3140aca24e4c98cd75b52b5c7722 si es backend seguro
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error enviando mensaje:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
