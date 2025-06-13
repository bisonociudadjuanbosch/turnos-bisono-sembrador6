const Turno = require('./models/Turno'); // Asegúrate de importar el modelo

app.post("/agregar-turno", async (req, res) => {
  const { numero, nombre, telefono } = req.body;

  if (!numero || !nombre || !telefono) {
    return res.status(400).json({ error: "Faltan datos requeridos." });
  }

  try {
    const nuevoTurno = new Turno({
      numero,
      nombre,
      telefono,
      fechaCreacion: new Date(),
      etapa: "Pendiente",
    });

    await nuevoTurno.save();

    res.status(200).json({ mensaje: "Turno agregado con éxito", turno: nuevoTurno });
  } catch (error) {
    console.error("Error al agregar turno:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
