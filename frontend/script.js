const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com"; // ← usa tu URL real

function generarTurno() {
  fetch(`${backendURL}/generar-turno`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // puedes enviar nombre, cedula, etc si lo estás recolectando
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Turno generado:", data);
    alert(`Tu turno es: ${data.numero}`);
    // aquí también puedes mostrarlo en pantalla
  })
  .catch(err => {
    console.error("Error al generar turno:", err);
    alert("Hubo un error al generar el turno");
  });
}