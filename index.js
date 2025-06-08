const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");  // <-- agregado

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = "./db.json";

app.use(cors());
app.use(bodyParser.json());

const uploadDir = path.join(__dirname, 'turnos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


// Servir carpeta tickets estática para acceder a las imágenes
app.use('/tickets', express.static(path.join(__dirname, 'tickets')));


app.use(express.static(path.join(__dirname))); // Sirve archivos como admin.html desde la raíz

app.get("/", (req, res) => {
  res.send("¡Servidor de Turnos Bisonó activo!");
});

app.get("/prueba", (req, res) => {
  res.send("Ruta de prueba funcionando");
});

// Funciones loadDB y saveDB igual que antes...

// POST /generar-turno igual que antes...

// POST /cambiar-etapa igual que antes...

// NUEVA RUTA para subir la imagen del turno
app.post('/upload-turno', (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No se recibió imagen' });
  }

  const matches = image.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Formato de imagen inválido' });
  }

  const base64Data = matches[1];
  const fileName = `turno_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, 'tickets', fileName);

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al guardar imagen' });
    }

    const urlPublica = `${req.protocol}://${req.get('host')}/tickets/${fileName}`;
    res.json({ url: urlPublica });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
