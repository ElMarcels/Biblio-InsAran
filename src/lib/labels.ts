// Etiquetas legibles para los valores que se guardan en la base de datos.

export function reservationStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Pendiente";
    case "FULFILLED":
      return "Servida";
    case "CANCELLED":
      return "Anulada";
    default:
      return status;
  }
}
