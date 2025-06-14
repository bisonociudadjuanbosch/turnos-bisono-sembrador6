const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: "tickets/" });

// API Gupshup config
const GUPSHUP_API_KEY = "mqlyqhzffbgosadyap1vz6qpt8qzltku";
const SOURCE_NUMBER = "18096690177";
const SRC_NAME = "ConstructoraBisono";

router.post("/enviar-imagen-whatsapp", upload.single("imagen"), async (req, res) => {
  const { telefono, nombre } = req.body;
  const filePath = req.file.path;

  try {
    // Leer imagen y convertir a base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    // Crear mensaje multimedia (imagen)
    const messagePayload = {
      channel: "whatsapp",
      source: SOURCE_NUMBER,
      destination: telefono,
      src.name: SRC_NAME,
      message: JSON.stringify({
        type: "image",
        originalUrl: `data:image/jpeg;base64,${base64Image}`,
        previewUrl: `data:image/jpeg;base64,${base64Image}`,
        caption: `Hola ${nombre}, aquí está tu turno generado. Te esperamos en Constructora Bisonó.`
      })
    };

    const params = new URLSearchParams(messagePayload);

    const response = await axios.post("https://api.gupshup.io/wa/api/v1/msg", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": GUPSHUP_API_KEY
      }
    });

    res.json({ status: "ok", gupshup: response.data });
  } catch (error) {
    console.error("Error al enviar imagen:", error.response?.data || error.message);
    res.status(500).json({ error: "No se pudo enviar la imagen por WhatsApp" });
  } finally {
    // Limpieza
    fs.unlink(filePath, () => {});
  }
});

module.exports = router;
