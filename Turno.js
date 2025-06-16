// turno.js
const express = require("express");
const router = express.Router();
const Turno = require("./models/Turno"); // Asegúrate de tener el modelo Turno definido
const { generarNumeroTurno } = require("./utils/generarTurno"); // Función para generar el número de turno

// Ruta para generar un nuevo turno
router.post("/turnos", async (req, res) => {
  const { nombre, telefono } = req.body;

  if (!telefono) {
    return res.status(400).json({ error: "El número de teléfono es obligatorio." });
  }

  try {
    // Generar el número de turno
    const numeroTurno = await generarNumeroTurno();

    // Crear un nuevo turno
    const nuevoTurno = new Turno({
      nombre,
      telefono,
      numeroTurno,
    });

    // Guardar el turno en la base de datos
    await nuevoTurno.save();

    // Responder con los datos del turno generado
    res.status(201).json({
      numeroTurno,
      mensaje: "Turno generado correctamente.",
    });
  } catch (error) {
    console.error("Error al generar el turno:", error);
    res.status(500).json({ error: "Hubo un problema al generar el turno." });
  }
});
router.post("/reiniciar", async (req, res) => {
  try {
    await Turno.deleteMany({});
    res.json({ ok: true, message: "Conteo reiniciado correctamente." });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Error al reiniciar" });
  }
module.exports = router;
