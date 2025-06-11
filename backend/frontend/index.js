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
      const data = JSON.parse(text);
      if (!Array.isArray(data.resultados)) throw new Error("Respuesta no válida del servidor");
      turnos = data.resultados;
    } catch {
      throw new Error("Respuesta no es un JSON válido: " + text);
    }

    if (turnos.length === 0) {
      tabla.innerHTML = "<tr><td colspan='7'>No hay turnos registrados.</td></tr>";
      return;
    }

    tabla.innerHTML = "";

    turnos.forEach(turno => {
      const fila = document.createElement("tr");

      const opcionesEstado = [
        "Pendiente",
        "Visitando Apartamentos Modelo",
        "Precalificando con el Banco",
        "OK",
        "En Proceso",
        "Finalizado"
      ];

      const opciones = opcionesEstado.map(estado =>
        `<option value="${estado}" ${turno.etapa === estado ? "selected" : ""}>${estado}</option>`
      ).join("");

      fila.innerHTML = `
        <td>${safe(turno.numero)}</td>
        <td>${safe(turno.etapa)}</td>
        <td>
          <select class="nuevo-estado">
            ${opciones}
          </select>
        </td>
        <td><button class="cambiar-estado">Cambiar</button></td>
        <td>${safe(turno.telefono)}</td>
        <td><button class="enviar-wsp">Enviar</button></td>
        <td class="resultado"></td>
      `;

      tabla.appendChild(fila);
    });

  } catch (error) {
    console.error("Error al obtener turnos:", error);
    tabla.innerHTML = `<tr><td colspan='7' class='error'>❌ Error al cargar turnos: ${error.message}</td></tr>`;
  }
}
