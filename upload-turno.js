const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Turno = require("./models/Turno"); // Ajusta la ruta si está en otro lugar

// 📂 Crear carpeta si no existe
const carpetaTickets = path.join(__dirname, "tickets");
if (!fs.existsSync(carpetaTickets)) fs.mkdirSync(carpetaTickets, { recursive: true });

// ✳️ Middleware RAW para imágenes en base64
router.post(
  "/subir-ticket",
  express.raw({ type: "application/json", limit: "5mb" }),
  async (req, res) => {
    let body;
    try {
      body = JSON.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: "JSON inválido" });
    }

    const { base64, nombreArchivo, turnoId } = body;

    if (!base64 || !nombreArchivo || !turnoId) {
      return res.status(400).json({ error: "Faltan datos: base64, nombreArchivo o turnoId" });
    }

    const nombreSeguro = path.basename(nombreArchivo).replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(carpetaTickets, `${nombreSeguro}.jpg`);
    const url = `/tickets/${nombreSeguro}.jpg`;

    try {
      // 🖼️ Guardar imagen como .jpg
      const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      fs.writeFileSync(filePath, buffer);

      // 🧠 Actualizar la base de datos
      const turnoActualizado = await Turno.findByIdAndUpdate(
        turnoId,
        { ticketURL: url },
        { new: true }
      );

      if (!turnoActualizado) {
        return res.status(404).json({ error: "Turno no encontrado" });
      }

      return res.json({ message: "Ticket guardado y turno actualizado", url });
    } catch (err) {
      console.error("❌ Error guardando imagen o actualizando turno:", err);
      return res.status(500).json({ error: "Error al guardar ticket o actualizar turno" });
    }
  }
);

module.exports = router;
