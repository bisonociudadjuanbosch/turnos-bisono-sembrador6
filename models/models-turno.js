// models/Turno.js - Esquema Mongoose para Turnos
const mongoose = require("mongoose");

const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },
  etapa: { type: String, default: "Pendiente" }
}, {
  timestamps: true
});

module.exports = mongoose.model("Turno", turnoSchema);
