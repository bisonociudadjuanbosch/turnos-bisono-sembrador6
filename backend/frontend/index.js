document.addEventListener("DOMContentLoaded", obtenerTurnos);

const safe = (str) => String(str || "").replace(/[&<>"']/g, s => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[s]));

async function obtenerTurnos() {
  const tabla = document.querySelector("#tabla-turnos tbody");
  tabla.innerHTML = "<tr><td colspan='7'>Cargando turnos...</td></tr>";

  try {
    const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos");
    const text = await res.text();

    let turnos;
    try {
      turnos = JSON.parse(text);
    } catch {
      throw new Error("Respuesta no JSON válida: " + text);
    }

    if (!Array.isArray(turnos)) throw new Error("Respuesta no válida del servidor");

    if (turnos.length === 0) {
      tabla.innerHTML = "<tr><td colspan='7'>No hay turnos registrados.</td></tr>";
      return;
    }

    tabla.innerHTML = "";

    turnos.forEach(turno => {
      // tu código para crear filas
    });

  } catch (error) {
    tabla.innerHTML = `<tr><td colspan='7' class='error'>Error al cargar turnos: ${error.message}</td></tr>`;
  }
}