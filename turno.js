const mongoose = require("mongoose");

const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },
  fechaHora: { type: String, required: true },
  etapa: { type: String, default: "Pendiente" }
});

module.exports = mongoose.models.Turno || mongoose.model("Turno", turnoSchema);
