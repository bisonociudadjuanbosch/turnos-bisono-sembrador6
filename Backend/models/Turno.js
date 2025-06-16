const mongoose = require('mongoose');

const turnoSchema = new mongoose.Schema({
  numeroTurno: Number,
  nombre: String,
  telefono: String,
  fecha: { type: Date, default: Date.now },
  estado: { type: String, default: 'Pendiente' },
  imagenUrl: String
});

module.exports = mongoose.model('Turno', turnoSchema);
