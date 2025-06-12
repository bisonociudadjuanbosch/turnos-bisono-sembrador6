// admin.js - Panel administrativo
const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";

window.addEventListener("DOMContentLoaded", async () => {
  const tabla = document.querySelector("#tabla-turnos tbody");
  const res = await fetch(`${backendURL}/turnos`);
  const turnos = await res.json();

  for (let turno of turnos) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${turno.numero}</td>
      <td>${turno.nombre}</td>
      <td>${turno.telefono}</td>
      <td>${turno.etapa}</td>
      <td>
        <select class="nuevo-estado">
          <option>Pendiente</option>
          <option>En Proceso</option>
          <option>Asistido</option>
          <option>Finalizado</option>
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

    resultado.textContent = "⏳...";
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
    const telefono = fila.cells[2].textContent;
    const resultado = fila.querySelector(".resultado");
    resultado.textContent = "⏳ Enviando...";

    const mensaje = "¡Hola! Es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó. Gracias por preferirnos.";
    const res = await fetch(`${backendURL}/enviar-turno`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono, mensaje })
    });

    const data = await res.json();
    resultado.textContent = res.ok ? "✅ WhatsApp enviado" : `❌ ${data.error}`;
  }
});
