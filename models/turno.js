// models/turno.js
const mongoose = require("mongoose");

// Definición del esquema para un turno
const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },
  fechaHora: { type: String, required: true },
  etapa: { type: String, default: "Pendiente" }
});

// Evitar redefinir el modelo si ya está registrado (útil en recargas)
module.exports = mongoose.models.Turno || mongoose.model("Turno", turnoSchema);
