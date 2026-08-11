const API_URL = "http://localhost:8000";

export async function enviarMensaje(
  mensaje: string,
  token: string
) {
  const respuesta = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: mensaje,
    }),
  });

  if (!respuesta.ok) {
    throw new Error("Error al enviar el mensaje");
  }

  return await respuesta.json();
}