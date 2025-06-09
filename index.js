const express = require('express');
const fs = require("fs");
const path = require("path");
const bodyParser = require('body-parser');
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 📂 Usa la ruta absoluta del disco montado en Render
const UPLOAD_FOLDER = "/uploads"; // debe coincidir con el mountPath

// Crea la carpeta si no existe
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}

// Sirve imágenes públicamente desde /turnos
app.use("/turnos", express.static(UPLOAD_FOLDER));

// Ruta para subir turno como imagen base64
app.post("/upload-turno", (req, res) => {
  const { image } = req.body;
  if (!image)
    return res.status(400).json({ error: "No se recibió imagen" });

  const matches = image.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!matches) return res.status(400).json({ error: "Formato inválido" });

  const ext = matches[1] === "png" ? "png" : "jpg";
  const base64Data = matches[2];
  const filename = `turno_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_FOLDER, filename);

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Fallo al guardar imagen" });
    }
    const url = `${req.protocol}://${req.get("host")}/turnos/${filename}`;
    res.json({ url });
  });
});

app.listen(process.env.PORT || 10000, () => {
  console.log("Server running");
});
