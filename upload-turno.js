const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Servir carpeta pública de imágenes
app.use('/turnos', express.static(path.join(__dirname, 'turnos')));

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
  const dir = path.join(__dirname, 'turnos');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const fileName = `turno_${Date.now()}.jpg`;
  const filePath = path.join(dir, fileName);

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al guardar imagen' });
    }

    const urlPublica = `${req.protocol}://${req.get('host')}/turnos/${fileName}`;
    res.json({ url: urlPublica });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
