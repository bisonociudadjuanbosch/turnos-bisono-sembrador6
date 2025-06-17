// backend/models/Turno.js
const mongoose = require("mongoose");

const TurnoSchema = new mongoose.Schema({
  nombre: String,
  telefono: String,
  estado: { type: String, default: "Pendiente" },
  ticketURL: String,
});

module.exports = mongoose.model("Turno", TurnoSchema);
