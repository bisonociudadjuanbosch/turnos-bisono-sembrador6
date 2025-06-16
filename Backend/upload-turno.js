// upload-turno.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const carpetaTickets = path.join(__dirname, "tickets");
if (!fs.existsSync(carpetaTickets)) fs.mkdirSync(carpetaTickets);

router.post("/subir-ticket", async (req, res) => {
  const { base64, nombreArchivo } = req.body;

  if (!base64 || !nombreArchivo) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const filePath = path.join(carpetaTickets, `${nombreArchivo}.jpg`);

  try {
    fs.writeFileSync(filePath, buffer);
    const url = `/tickets/${nombreArchivo}.jpg`;
    res.json({ url });
  } catch (err) {
    console.error("❌ Error guardando imagen:", err);
    res.status(500).json({ error: "No se pudo guardar la imagen" });
  }
});

module.exports = router;
