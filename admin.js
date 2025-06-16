// admin.js

const BACKEND_URL = "https://turnos-bisono-sembrador6-5pfm.onrender.com";
const tablaTurnos = document.getElementById("tablaTurnos");
const statusMsg = document.getElementById("statusMsg");

// Carga y muestra la lista de turnos
async function cargarTurnos() {
  try {
    const resp = await fetch(`${BACKEND_URL}/turnos`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const turnos = await resp.json();

    tablaTurnos.innerHTML = "";

    turnos.forEach((turno, _, arr) => {
      const esperando = arr.filter(t => t.estado === "Pendiente" && t.numeroTurno > turno.numeroTurno).length;
      const fechaHora = new Date(turno.fecha).toLocaleString();

      let ticketHTML;
      if (turno.ticketUrl) {
        ticketHTML = `<a href="${BACKEND_URL}${turno.ticketUrl}" target="_blank">Ver Ticket</a>`;
      } else {
        ticketHTML = `<button class="btnGenerarTicket" data-id="${turno._id}" data-num="${turno.numeroTurno}" data-nombre="${encodeURIComponent(turno.nombre)}" data-fecha="${turno.fecha}" data-esperando="${esperando}">Generar Ticket</button>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${turno.numeroTurno}</td>
        <td>${turno.nombre}</td>
        <td>${turno.telefono}</td>
        <td>${fechaHora}</td>
        <td>
          <select data-id="${turno._id}" class="estadoSelect">
            <option value="Pendiente" ${turno.estado==="Pendiente"?"selected":""}>Pendiente</option>
            <option value="En Proceso" ${turno.estado==="En Proceso"?"selected":""}>En Proceso</option>
            <option value="Finalizado" ${turno.estado==="Finalizado"?"selected":""}>Finalizado</option>
          </select>
        </td>
        <td><button class="btnEnviar" data-id="${turno._id}">Enviar WhatsApp</button></td>
        <td>${ticketHTML}</td>
      `;
      tablaTurnos.appendChild(tr);
    });

    setupHandlers();
  } catch (err) {
    statusMsg.textContent = `❌ Error cargando turnos: ${err.message}`;
    statusMsg.style.color = "red";
  }
}

// Agrega los event listeners después de renderizar
function setupHandlers() {
  document.querySelectorAll(".estadoSelect").forEach(select => {
    select.onchange = async () => {
      const id = select.dataset.id;
      const nuevo = select.value;
      try {
        const resp = await fetch(`${BACKEND_URL}/cambiar-etapa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idTurno: id, nuevoEstado: nuevo })
        });
        const j = await resp.json();
        statusMsg.textContent = j.message || `Estado actualizado a ${nuevo}`;
        statusMsg.style.color = "green";
        cargarTurnos();
      } catch {
        statusMsg.textContent = "❌ Error actualizando estado";
        statusMsg.style.color = "red";
      }
    };
  });

  document.querySelectorAll(".btnEnviar").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try {
        const resp = await fetch(`${BACKEND_URL}/enviar-whatsapp/${id}`, { method: "POST" });
        const j = await resp.json();
        statusMsg.textContent = j.message || "📨 WhatsApp enviado";
        statusMsg.style.color = "green";
      } catch {
        statusMsg.textContent = "❌ Error enviando WhatsApp";
        statusMsg.style.color = "red";
      }
    };
  });

  document.querySelectorAll(".btnGenerarTicket").forEach(btn => {
    btn.onclick = async () => {
      statusMsg.textContent = "";
      const id = btn.dataset.id;
      const num = btn.dataset.num;
      const nombre = decodeURIComponent(btn.dataset.nombre);
      const fechaISO = btn.dataset.fecha;
      const esperando = btn.dataset.esperando;

      try {
        const resp = await fetch(`${BACKEND_URL}/generar-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, numeroTurno: num, nombre, fechaISO, esperando })
        });
        const j = await resp.json();
        if (j.ok) {
          statusMsg.textContent = `✅ Ticket generado para turno ${num}`;
          statusMsg.style.color = "green";
          cargarTurnos();
        } else {
          throw new Error(j.error || "Respuesta no OK");
        }
      } catch {
        statusMsg.textContent = "❌ Error generando ticket";
        statusMsg.style.color = "red";
      }
    };
  });
}

// Inicializar y refrescar cada 30 segundos
cargarTurnos();
setInterval(cargarTurnos, 30000);
