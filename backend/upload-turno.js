const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Aumentar el límite si la imagen es grande

// Servir carpeta pública para las imágenes
app.use('/turnos', express.static(path.join(__dirname, 'turnos')));

app.post('/upload-turno', (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No se recibió imagen' });
  }

  // image tiene formato: data:image/jpeg;base64,xxxxxxx
  const matches = image.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Formato de imagen inválido' });
  }

  const base64Data = matches[1];
  // Generar un nombre único para el archivo, por ejemplo con timestamp
  const fileName = `turno_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, 'turnos', fileName);

  // Guardar la imagen
  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al guardar imagen' });
    }

    // Retornar la URL pública
    const urlPublica = `${req.protocol}://${req.get('host')}/turnos/${fileName}`;
    res.json({ url: urlPublica });
  });
});

// 1. Subir imagen (ticket) - versión robusta
app.post("/upload-turno", (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No se recibió imagen" });
  }

  const matches = image.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: "Formato de imagen inválido" });
  }

  const ext = matches[1] === "png" ? "png" : "jpg";
  const base64Data = matches[2];
  const fileName = `turno_${Date.now()}.${ext}`;
  const filePath = path.join(TICKETS, fileName);

  fs.writeFile(filePath, base64Data, "base64", (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al guardar imagen" });
    }

    const url = `${req.protocol}://${req.get("host")}/tickets/${fileName}`;
    res.json({ url });
  });
});

// Arranca el servidor normalmente
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
