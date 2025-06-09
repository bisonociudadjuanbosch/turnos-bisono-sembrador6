const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let turnoActual = null;
let intervaloVerificacion = null;

document.addEventListener("DOMContentLoaded", () => {
  function generarTurno() {
    const nombre = document.querySelector("#nombre").value.trim();
    const telefono = document.querySelector("#telefono").value.trim();

    if (!nombre || !telefono) {
      alert("Por favor ingresa tu nombre y teléfono.");
      return;
    }

    fetch(`${backendURL}/generar-turno`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono })
    })
    .then(res => res.json())
    .then(data => {
      if (!data._id) {
        alert("Error: respuesta inválida del servidor.");
        return;
      }
      turnoActual = data;
      document.getElementById("formulario-turno").style.display = "none";
      document.getElementById("pantalla-turno").style.display = "block";

      document.getElementById("ticket-numero").textContent = data.numero || "N/A";
      document.getElementById("ticket-nombre").textContent = `Nombre: ${data.nombre || ''}`;
      document.getElementById("ticket-telefono").textContent = `Teléfono: ${data.telefono || ''}`;

      if (intervaloVerificacion) clearInterval(intervaloVerificacion);
      intervaloVerificacion = setInterval(verificarEstadoTurno, 5000);
    })
    .catch(err => {
      console.error(err);
      alert("Hubo un error al generar el turno");
    });
  }

  window.generarTurno = generarTurno;

  function verificarEstadoTurno() {
    if (!turnoActual || !turnoActual._id) return;

    fetch(`${backendURL}/turnos/${turnoActual._id}`)
      .then(res => res.json())
      .then(data => {
        const estadosAlerta = ["En Proceso", "Asistido", "Finalizado"];
        if (estadosAlerta.includes(data.estado)) {
          alert("¡Es tu turno! Acércate a nuestro Oficial de Ventas Bisonó.");
          clearInterval(intervaloVerificacion);
          intervaloVerificacion = null;
        }
      })
      .catch(console.error);
  }
});

