const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = "./db.json";

app.use(cors());
app.use(bodyParser.json());

// Ruta raíz
app.get("/", (req, res) => {
  res.send("¡Servidor de Turnos Bisonó activo!");
});

// Ruta de prueba opcional
app.get("/prueba", (req, res) => {
  res.send("Ruta de prueba funcionando");
});

// Cargar turnos desde db.json
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE));
}

// Guardar turnos en db.json
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generar nuevo turno
app.post("/generar-turno", (req, res) => {
  let db = loadDB();
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const turnosHoy = db.filter(t => t.fecha.startsWith(fechaHoy));
  const ultimo = turnosHoy.length > 0 ? turnosHoy[turnosHoy.length - 1].numero : "T-0000";
  const secuencia = parseInt(ultimo.split("-")[1]) + 1;
  const nuevoTurno = {
    numero: `T-${secuencia.toString().padStart(4, "0")}`,
    fecha: new Date().toISOString(),
    etapa: "Pendiente"
  };
  db.push(nuevoTurno);
  saveDB(db);
  res.json({
    turno: nuevoTurno,
    enEspera: db.filter(t => t.fecha.startsWith(fechaHoy) && t.etapa === "Pendiente").length
  });
});

// Cambiar etapa de un turno
app.post("/cambiar-etapa", (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  let db = loadDB();
  const index = db.findIndex(t => t.numero === numero);
  if (index >= 0) {
    db[index].etapa = nuevaEtapa;
    saveDB(db);
    res.json({ status: "ok", turno: db[index] });
  } else {
    res.status(404).json({ status: "not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
