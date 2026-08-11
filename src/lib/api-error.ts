import { ApiError } from '@/lib/api'
import type { Idioma } from '@/lib/i18n'

/**
 * Qué enseñar cuando la API falla.
 *
 * Los mensajes del servidor están escritos en español —"Ese horario ya fue
 * tomado", "Ese correo ya tiene cuenta"— y son buenos: dicen exactamente qué
 * pasó. Pero en la web en inglés serían la única frase en español de la
 * pantalla, y encima en el peor momento.
 *
 * Así que en español se enseña el del servidor, que informa mejor, y en inglés
 * el nuestro, que informa menos pero está en el idioma que se está leyendo.
 * Traducirlos de verdad exige que la API devuelva códigos en lugar de frases:
 * está anotado como lo siguiente, y hasta entonces esto es lo honesto.
 */
export function mensajeDeError(
  error: unknown,
  idioma: Idioma,
  respaldo: string,
): string {
  if (idioma === 'es' && error instanceof ApiError && error.message) {
    return error.message
  }
  return respaldo
}
