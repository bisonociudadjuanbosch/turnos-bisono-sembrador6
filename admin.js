// admin.js - Panel administrativo con reinicio y filtros avanzados
const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let todosLosTurnos = [];

window.addEventListener("DOMContentLoaded", async () => {
  await cargarTurnos();

  document.getElementById("reiniciar-conteo").addEventListener("click", async () => {
    if (confirm("¿Estás seguro de reiniciar el conteo diario?")) {
      const res = await fetch(`${backendURL}/reiniciar-turnos`, { method: "POST" });
      const data = await res.json();
      alert(data.mensaje || data.error);
      location.reload();
    }
  });

  document.getElementById("btn-filtrar").addEventListener("click", () => aplicarFiltros());
});

async function cargarTurnos() {
  const tabla = document.querySelector("#tabla-turnos tbody");
  tabla.innerHTML = "";
  const res = await fetch(`${backendURL}/turnos`);
  const data = await res.json();
  todosLosTurnos = data.resultados || [];

  for (let turno of todosLosTurnos) {
    const fila = document.createElement("tr");
    fila.dataset.numero = turno.numero;
    fila.dataset.nombre = turno.nombre;
    fila.dataset.telefono = turno.telefono;
    fila.dataset.etapa = turno.etapa;
    fila.dataset.fecha = turno.createdAt;

    fila.innerHTML = `
      <td>${turno.numero}</td>
      <td>${turno.nombre}</td>
      <td>${turno.telefono}</td>
      <td>${turno.etapa}</td>
      <td>
        <select class="nuevo-estado">
          <option${turno.etapa === "Pendiente" ? " selected" : ""}>Pendiente</option>
          <option${turno.etapa === "Visitando apartamento modelo" ? " selected" : ""}>Visitando apartamento modelo</option>
          <option${turno.etapa === "Precalificando con el banco" ? " selected" : ""}>Precalificando con el banco</option>
          <option${turno.etapa === "En Proceso" ? " selected" : ""}>En Proceso</option>
          <option${turno.etapa === "Finalizado" ? " selected" : ""}>Finalizado</option>
          <option${turno.etapa === "OK" ? " selected" : ""}>OK</option>
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
}

document.addEventListener("click", async (e) => {
  const fila = e.target.closest("tr");
  if (!fila) return;

  if (e.target.classList.contains("btn-estado")) {
    const numero = fila.dataset.numero;
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
    const numero = fila.dataset.numero;
    const nombre = fila.dataset.nombre;
    const telefono = fila.dataset.telefono;
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

function aplicarFiltros() {
  const nombre = document.getElementById("filtro-nombre").value.toLowerCase();
  const telefono = document.getElementById("filtro-telefono").value;
  const etapa = document.getElementById("filtro-etapa").value;
  const fecha = document.getElementById("filtro-fecha").value;

  const filtrados = todosLosTurnos.filter(turno => {
    const coincideNombre = turno.nombre.toLowerCase().includes(nombre);
    const coincideTelefono = turno.telefono.includes(telefono);
    const coincideEtapa = etapa ? turno.etapa === etapa : true;
    const coincideFecha = fecha ? turno.createdAt?.slice(0, 10) === fecha : true;
    return coincideNombre && coincideTelefono && coincideEtapa && coincideFecha;
  });

  mostrarTurnosFiltrados(filtrados);
}

function mostrarTurnosFiltrados(turnos) {
  const tabla = document.querySelector("#tabla-turnos tbody");
  tabla.innerHTML = "";
  for (let turno of turnos) {
    const fila = document.createElement("tr");
    fila.dataset.numero = turno.numero;
    fila.dataset.nombre = turno.nombre;
    fila.dataset.telefono = turno.telefono;
    fila.dataset.etapa = turno.etapa;
    fila.dataset.fecha = turno.createdAt;

    fila.innerHTML = `
      <td>${turno.numero}</td>
      <td>${turno.nombre}</td>
      <td>${turno.telefono}</td>
      <td>${turno.etapa}</td>
      <td>
        <select class="nuevo-estado">
          <option${turno.etapa === "Pendiente" ? " selected" : ""}>Pendiente</option>
          <option${turno.etapa === "Visitando apartamento modelo" ? " selected" : ""}>Visitando apartamento modelo</option>
          <option${turno.etapa === "Precalificando con el banco" ? " selected" : ""}>Precalificando con el banco</option>
          <option${turno.etapa === "En Proceso" ? " selected" : ""}>En Proceso</option>
          <option${turno.etapa === "Finalizado" ? " selected" : ""}>Finalizado</option>
          <option${turno.etapa === "OK" ? " selected" : ""}>OK</option>
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
}