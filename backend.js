// backend.js
app.post("/agregar-turno", (req, res) => {
  const { numero, nombre, telefono } = req.body;
  const fechaCreacion = new Date().toISOString(); // Fecha y hora actual

  const nuevoTurno = {
    numero,
    nombre,
    telefono,
    fechaCreacion,
    etapa: "Pendiente",
  };

  turnos.push(nuevoTurno);
  res.status(200).json({ mensaje: "Turno agregado con éxito" });
});
