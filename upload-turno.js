// upload-turno.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const carpetaTickets = path.join(__dirname, "tickets");
if (!fs.existsSync(carpetaTickets)) fs.mkdirSync(carpetaTickets);

// ✳️ Middleware RAW para procesar bodies grandes
router.post(
  "/subir-ticket",
  express.raw({ type: "application/json", limit: "5mb" }),
  async (req, res) => {
    let body;
    try {
      body = JSON.parse(req.body); // parseamos manualmente
    } catch (err) {
      return res.status(400).json({ error: "JSON inválido" });
    }

    const { base64, nombreArchivo } = body;
    if (!base64 || !nombreArchivo) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const buffer = Buffer.from(base64.replace(/^data:image\/.+;base64,/, ""), "base64");
    const filePath = path.join(carpetaTickets, `${nombreArchivo}.jpg`);

    try {
      fs.writeFileSync(filePath, buffer);
      const url = `/tickets/${nombreArchivo}.jpg`;
      res.json({ url });
    } catch (err) {
      console.error("❌ Error guardando imagen:", err);
      res.status(500).json({ error: "No se pudo guardar la imagen" });
    }
  }
);

module.exports = router;
