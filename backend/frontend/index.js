document.addEventListener("click", async function (e) {
  if (e.target.classList.contains("enviar-wsp")) {
    const fila = e.target.closest("tr");
    const telefono = fila.cells[4].textContent.trim();
    const numero = fila.cells[0].textContent.trim();
    const resultado = fila.querySelector(".resultado");

    if (!esTelefonoValido(telefono)) {
      resultado.textContent = "❌ Número inválido";
      resultado.className = "resultado error";
      return;
    }

    e.target.disabled = true;
    resultado.textContent = "⏳ Enviando WhatsApp...";

    try {
      const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/enviar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroTelefono: telefono,
          mensaje: `¡Hola! Es tu turno (${numero}). Por favor acércate a nuestro Oficial de Ventas Bisonó.`
        })
      });

      const data = await res.json();

      if (res.ok) {
        resultado.textContent = "✅ WhatsApp enviado";
        resultado.className = "resultado success";
      } else {
        resultado.textContent = `❌ Error: ${data.error || "No se pudo enviar"}`;
        resultado.className = "resultado error";
      }
    } catch (err) {
      console.error("Error al enviar WhatsApp:", err);
      resultado.textContent = "❌ Error de red";
      resultado.className = "resultado error";
    }

    e.target.disabled = false;
  }

  if (e.target.classList.contains("cambiar-estado")) {
    const fila = e.target.closest("tr");
    const nuevoEstado = fila.querySelector(".nuevo-estado").value;
    const numero = fila.cells[0].textContent.trim();
    const resultado = fila.querySelector(".resultado");

    e.target.disabled = true;
    resultado.textContent = "⏳ Cambiando etapa...";

    try {
      const res = await fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/cambiar-etapa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, nuevaEtapa: nuevoEstado })
      });

      const data = await res.json();

      if (res.ok) {
        resultado.textContent = "✅ Etapa actualizada";
        resultado.className = "resultado success";
      } else {
        resultado.textContent = `❌ Error: ${data.error || "No se pudo actualizar"}`;
        resultado.className = "resultado error";
      }
    } catch (err) {
      console.error("Error al cambiar etapa:", err);
      resultado.textContent = "❌ Error de red";
      resultado.className = "resultado error";
    }

    e.target.disabled = false;
  }
});

// Validación de número en formato internacional
function esTelefonoValido(numero) {
  return /^\+?\d{10,15}$/.test(numero.replace(/\s+/g, ""));
}
