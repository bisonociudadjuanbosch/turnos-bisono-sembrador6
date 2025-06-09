const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let turnoActual = null;

document.addEventListener("DOMContentLoaded", () => {
  function generarTurno() {
    const nombre = document.querySelector("#nombre").value;
    const telefono = document.querySelector("#telefono").value;

    fetch(`${backendURL}/generar-turno`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono })
    })
    .then(res => res.json())
    .then(data => {
      turnoActual = data;
      document.getElementById("formulario-turno").style.display = "none";
      document.getElementById("pantalla-turno").style.display = "block";

      document.getElementById("ticket-numero").textContent = data.numero;
      document.getElementById("ticket-nombre").textContent = `Nombre: ${data.nombre || ''}`;
      document.getElementById("ticket-telefono").textContent = `Teléfono: ${data.telefono || ''}`;

      setInterval(verificarEstadoTurno, 5000);
    })
    .catch(err => {
      console.error(err);
      alert("Hubo un error al generar el turno");
    });
  }

  window.generarTurno = generarTurno; // necesario si el form llama a generarTurno()

  function verificarEstadoTurno() {
    if (!turnoActual || !turnoActual._id) return;

    fetch(`${backendURL}/turnos/${turnoActual._id}`)
      .then(res => res.json())
      .then(data => {
        if (data.estado === "En Proceso" || data.estado === "Asistido" || data.estado === "Finalizado") {
          alert("¡Es tu turno! Acércate a nuestro Oficial de Ventas Bisonó.");
        }
      })
      .catch(console.error);
  }
});
