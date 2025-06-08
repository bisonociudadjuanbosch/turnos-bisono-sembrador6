document.addEventListener("DOMContentLoaded", obtenerTurnos);

const safe = (str) => String(str || "").replace(/[&<>"']/g, s => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[s]));

async function obtenerTurnos() {
  const tabla = document.querySelector("#tabla-turnos tbody");
  tabla.innerHTML = "<tr><td colspan='7'>Cargando turnos...</td></tr>";

  try {
    const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos");
    const turnos = await res.json();

    if (!Array.isArray(turnos)) throw new Error("Respuesta no válida del servidor");

    if (turnos.length === 0) {
      tabla.innerHTML = "<tr><td colspan='7'>No hay turnos registrados.</td></tr>";
      return;
    }

    tabla.innerHTML = "";

    turnos.forEach(turno => {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${safe(turno.numero)}</td>
        <td>${safe(turno.estado)}</td>
        <td>
          <select>
            <option ${turno.estado === 'Visitando Apartamentos Modelo' ? 'selected' : ''}>Visitando Apartamentos Modelo</option>
            <option ${turno.estado === 'Precalificando con el Banco' ? 'selected' : ''}>Precalificando con el Banco</option>
            <option ${turno.estado === 'En proceso' ? 'selected' : ''}>En proceso</option>
            <option ${turno.estado === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
          </select>
        </td>
        <td><button onclick="cambiarEtapa('${safe(turno.numero)}', this)">Cambiar</button></td>
        <td>${turno.whatsapp ? safe(turno.whatsapp) : 'No registrado'}</td>
        <td><button onclick="enviarWhatsAppManual('${safe(turno.whatsapp)}', '${safe(turno.numero)}', this)" ${!turno.whatsapp ? 'disabled' : ''}>Enviar WhatsApp</button></td>
        <td class="resultado"></td>
      `;

      tabla.appendChild(fila);
    });

  } catch (error) {
    tabla.innerHTML = `<tr><td colspan='7' class='error'>Error al cargar turnos: ${error.message}</td></tr>`;
  }
}

async function cambiarEtapa(numero, boton) {
  const fila = boton.closest("tr");
  const nuevaEtapa = fila.querySelector("select").value;
  const resultado = fila.querySelector(".resultado");

  boton.disabled = true;
  resultado.textContent = "Cambiando etapa...";

  try {
    const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/cambiar-etapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, nuevaEtapa })
    });

    const data = await res.json();

    if (res.ok) {
      resultado.textContent = "✅ Etapa actualizada";
      resultado.className = "resultado success";
    } else {
      resultado.textContent = `❌ ${data.error || 'Error desconocido'}`;
      resultado.className = "resultado error";
    }

  } catch (err) {
    resultado.textContent = "❌ Error de red o servidor";
    resultado.className = "resultado error";
  }

  boton.disabled = false;
}

async function enviarWhatsAppManual(telefono, turno, boton) {
  const fila = boton.closest("tr");
  const resultado = fila.querySelector(".resultado");

  if (!telefono || !turno) {
    resultado.textContent = "❌ Número o turno inválido";
    resultado.className = "resultado error";
    return;
  }

  boton.disabled = true;
  resultado.textContent = "Enviando WhatsApp...";

  try {
    const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/enviar-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroTelefono: telefono,
        mensaje: `¡Hola! Es tu turno (${turno}). Por favor acércate a nuestro Oficial de Ventas Bisonó.`
      })
    });

    const data = await res.json();

    if (res.ok) {
      resultado.textContent = "✅ WhatsApp enviado";
      resultado.className = "resultado success";
    } else {
      resultado.textContent = `❌ ${data.error || 'No se pudo enviar'}`;
      resultado.className = "resultado error";
    }

  } catch (err) {
    resultado.textContent = "❌ Error al enviar WhatsApp";
    resultado.className = "resultado error";
  }

  boton.disabled = false;
}
