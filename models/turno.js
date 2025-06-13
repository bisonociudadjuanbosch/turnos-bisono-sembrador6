const mongoose = require("mongoose");

const etapasValidas = [
  "Pendiente",
  "Visitando apartamento modelo",
  "Precalificando con el banco",
  "En Proceso",
  "Finalizado",
  "OK"
];

const turnoSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  telefono: { type: String, required: true },
  etapa: { type: String, enum: etapasValidas, default: "Pendiente" }
}, {
  timestamps: true
});

// Campo virtual para fechaCreacion igual a createdAt
turnoSchema.virtual("fechaCreacion").get(function () {
  return this.createdAt;
});

// Para que al hacer .toJSON() incluya el virtual fechaCreacion
turnoSchema.set("toJSON", { virtuals: true });
turnoSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Turno", turnoSchema);
