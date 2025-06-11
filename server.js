const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Conexión a MongoDB con manejo de errores
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/turnos", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("✅ Conectado a MongoDB");
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err.message);
  });

// Modelo de datos
const Turno = mongoose.model("Turno", new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  fechaHora: String,
  etapa: String,
}));

// Rutas
app.post("/turnos", async (req, res) => {
  try {
    const nuevo = await Turno.create(req.body);
    res.json(nuevo);
  } catch (err) {
    res.status(500).json({ error: "Error al registrar turno" });
  }
});

app.get("/turnos", async (req, res) => {
  const pagina = parseInt(req.query.pagina || 1);
  const limite = parseInt(req.query.limite || 50);
  try {
    const resultados = await Turno.find()
      .skip((pagina - 1) * limite)
      .limit(limite)
      .sort({ _id: 1 }); // orden cronológico
    res.json({ resultados });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener turnos" });
  }
});

app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  try {
    const actualizado = await Turno.findOneAndUpdate(
      { numero },
      { etapa: nuevaEtapa },
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ error: "Turno no encontrado" });
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: "Error al cambiar etapa" });
  }
});

app.post("/upload-turno", async (req, res) => {
  const { image } = req.body;
  try {
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");

    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    const filename = `turno-${crypto.randomUUID()}.jpg`;
    const filePath = path.join(publicDir, filename);
    fs.writeFileSync(filePath, base64Data, "base64");

    const url = `${req.protocol}://${req.get("host")}/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Error al guardar imagen:", err.message);
    res.status(500).json({ error: "Error al guardar imagen" });
  }
});

// Archivos estáticos (imágenes)
app.use(express.static("public"));

// Ruta raíz informativa
app.get("/", (req, res) => {
  res.send("🟢 API de Turnos Bisonó funcionando. Usa /turnos para obtener turnos.");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
});
