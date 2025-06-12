// admin.js
btnFiltrar.addEventListener("click", () => {
  const filtros = {
    nombre: filtroNombre.value.trim(),
    telefono: filtroTelefono.value.trim(),
    fecha: filtroFecha.value.trim(),
    etapa: filtroEtapa.value,
  };
  cargarTurnos(filtros);
});

async function cargarTurnos(filtros = {}) {
  try {
    const res = await fetch(`${API_URL}/turnos`);
    if (!res.ok) throw new Error("Error al cargar los turnos");
    const data = await res.json();
    let turnos = data.resultados;

    if (filtros.nombre) {
      turnos = turnos.filter(t => t.nombre.toLowerCase().includes(filtros.nombre.toLowerCase()));
    }
    if (filtros.telefono) {
      turnos = turnos.filter(t => t.telefono.includes(filtros.telefono));
    }
    if (filtros.fecha) {
      turnos = turnos.filter(t => new Date(t.createdAt).toISOString().slice(0, 10) === filtros.fecha);
    }
    if (filtros.etapa) {
      turnos = turnos.filter(t => t.etapa === filtros.etapa);
    }

    tablaCuerpo.innerHTML = "";
    conteoTotal.textContent = `Total de turnos: ${turnos.length}`;

    if (turnos.length === 0) {
      tablaCuerpo.innerHTML = `<tr><td colspan="8">No hay turnos que coincidan con los filtros.</td></tr>`;
      return;
    }

    turnos.forEach(turno => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${turno.numero}</td>
        <td>${turno.nombre}</td>
        <td>${turno.telefono}</td>
        <td>${new Date(turno.createdAt).toLocaleString()}</td>
        <td>${turno.etapa}</td>
        <td>
          <select data-numero="${turno.numero}" class="select-etapa">
            <option value="">-- Cambiar etapa --</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Visitando apartamento modelo">Visitando apartamento modelo</option>
            <option value="Precalificando con el banco">Precalificando con el banco</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Finalizado">Finalizado</option>
            <option value="OK">OK</option>
          </select>
        </td>
        <td>
          <button data-numero="${turno.numero}" class="btn-whatsapp">Actualizar WhatsApp</button>
        </td>
        <td class="resultado"></td>
      `;
      tablaCuerpo.appendChild(tr);
    });

    document.querySelectorAll(".btn-whatsapp").forEach(btn => {
      btn.addEventListener("click", () => {
        const numero = btn.dataset.numero;
        const telefono = turnos.find(t => t.numero === numero).telefono;
        const mensaje = encodeURIComponent("¡Hola! es tu turno por favor acercate a nuestro Oficial de Venta Bisono.");
        const url = `https://wa.me/${telefono}?text=${mensaje}`;
        window.open(url, "_blank");
      });
    });

    document.querySelectorAll(".select-etapa").forEach(select => {
      select.addEventListener("change", async () => {
        const numero = select.dataset.numero;
        const nuevaEtapa = select.value;
        const resultadoCelda = select.closest("tr").querySelector(".resultado");

        if (!nuevaEtapa) {
          resultadoCelda.textContent = "Seleccione una etapa válida.";
          resultadoCelda.className = "error";
          return;
        }

        try {
          const res = await fetch(`${API_URL}/cambiar-etapa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero, nuevaEtapa })
          });
          if (!res.ok) throw new Error("Error al actualizar la etapa");
          resultadoCelda.textContent = "Etapa actualizada con éxito";
          resultadoCelda.className = "success";
          cargarTurnos(getFiltrosActuales());
        } catch (error) {
          resultadoCelda.textContent = "Error actualizando etapa";
          resultadoCelda.className = "error";
        }
      });
    });
  } catch (error) {
    tablaCuerpo.innerHTML = `<tr><td colspan="8">Error cargando los turnos.</td></tr>`;
  }
}
