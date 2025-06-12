// admin.js - Panel administrativo con integración WhatsApp
const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";

window.addEventListener("DOMContentLoaded", async () => {
  const tabla = document.querySelector("#tabla-turnos tbody");
  const res = await fetch(`${backendURL}/turnos`);
  const data = await res.json();
  const turnos = data.resultados || [];

  for (let turno of turnos) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${turno.numero}</td>
      <td>${turno.nombre}</td>
      <td>${turno.telefono}</td>
      <td>${turno.etapa}</td>
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
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-estado")) {
    const fila = e.target.closest("tr");
    const numero = fila.cells[0].textContent;
    const nuevoEstado = fila.querySelector(".nuevo-estado").value;
    const resultado = fila.querySelector(".resultado");

    resultado.textContent = "⏳ Actualizando...";
    const res = await fetch(`${backendURL}/cambiar-etapa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, nuevaEtapa: nuevoEstado })
    });
    const data = await res.json();
    resultado.textContent = res.ok ? "✅ Actualizado" : `❌ ${data.error}`;
  }

  if (e.target.classList.contains("btn-whatsapp")) {
    const fila = e.target.closest("tr");
    const numero = fila.cells[0].textContent;
    const nombre = fila.cells[1].textContent;
    const telefono = fila.cells[2].textContent;
    const resultado = fila.querySelector(".resultado");

    resultado.textContent = "⏳ Enviando...";

    try {
      const linkImagen = `${backendURL}/turnos/turno_${numero}.jpg`;

      const res = await fetch(`${backendURL}/enviar-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroTelefono: telefono,
          plantillaId: "b7648d2e-cc8b-428d-8552-d3374061df33",
          nombreCliente: nombre,
          imagenUrl: linkImagen
        })
      });

      const data = await res.json();
      resultado.textContent = res.ok ? "✅ WhatsApp enviado" : `❌ ${data.error}`;
    } catch (err) {
      console.error(err);
      resultado.textContent = "❌ Error al enviar";
    }
  }
});