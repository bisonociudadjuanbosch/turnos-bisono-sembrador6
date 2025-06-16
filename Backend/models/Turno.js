const mongoose = require("mongoose");

const TurnoSchema = new mongoose.Schema({
  nombre: String,
  telefono: String,
  numeroTurno: Number,
  estado: { type: String, default: "Pendiente" },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Turno", TurnoSchema);
