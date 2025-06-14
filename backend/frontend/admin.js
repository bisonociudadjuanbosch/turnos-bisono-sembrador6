const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";

window.addEventListener("DOMContentLoaded", async () => {
  const tabla = document.querySelector("#tabla-turnos tbody");
  try {
    const res = await fetch(`${backendURL}/turnos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const turnos = await res.json();

    tabla.innerHTML = ""; // Limpiar tabla antes de insertar

    for (let turno of turnos.resultados || turnos) { 
      // dependiendo si la respuesta viene con "resultados" o es array directo
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${turno.numero}</td>
        <td>${turno.nombre}</td>
        <td>${turno.telefono}</td>
        <td>${turno.etapa || "Pendiente"}</td>
        <td>
          <select class="nuevo-estado">
            <option${turno.etapa === "Pendiente" ? " selected" : ""}>Pendiente</option>
            <option${turno.etapa === "En Proceso" ? " selected" : ""}>En Proceso</option>
            <option${turno.etapa === "Asistido" ? " selected" : ""}>Asistido</option>
            <option${turno.etapa === "Finalizado" ? " selected" : ""}>Finalizado</option>
          </select>
        </td>
        <td>
          <button class="btn-estado">Actualizar</button>
          <button class="btn-whatsapp">WhatsApp</button>
        </td>
        <td class="resultado"></td>
      `;
      tabla.appendChild(fila);
    }
  } catch (error) {
    tabla.innerHTML = `<tr><td colspan="7">❌ Error cargando turnos: ${error.message}</td></tr>`;
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-estado")) {
    const fila = e.target.closest("tr");
    const numero = fila.cells[0].textContent;
    const nuevoEstado = fila.querySelector(".nuevo-estado").value;
    const resultado = fila.querySelector(".resultado");

    resultado.textContent = "⏳ Actualizando...";
    try {
      const res = await fetch(`${backendURL}/cambiar-etapa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, nuevaEtapa: nuevoEstado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      fila.cells[3].textContent = nuevoEstado; // Actualizar estado visible
      resultado.textContent = "✅ Actualizado";
    } catch (error) {
      resultado.textContent = `❌ ${error.message}`;
    }
  }

  if (e.target.classList.contains("btn-whatsapp")) {
    const fila = e.target.closest("tr");
    const telefono = fila.cells[2].textContent;
    const resultado = fila.querySelector(".resultado");
    resultado.textContent = "⏳ Enviando WhatsApp...";

    const mensaje = "¡Hola! Es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó. Gracias por preferirnos.";

    try {
      const res = await fetch(`${backendURL}/enviar-turno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, mensaje })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      resultado.textContent = "✅ WhatsApp enviado";
    } catch (error) {
      resultado.textContent = `❌ ${error.message}`;
    }
  }
  document.getElementById("btn-refrescar").addEventListener("click", () => {
  obtenerTurnos();
});
});
