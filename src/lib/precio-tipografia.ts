/**
 * Que tamaño de letra admite un precio sin partirse.
 *
 * Los cortes salen de medir, no de estimar: en la rejilla de tres, la franja
 * deja unos 148 px para la cifra mas "COP", y con digitos tabulares eso son
 * doce caracteres a 20 px, catorce a 16 y los que vengan a 14. Un inmueble de
 * 18.000 millones existe —hay uno— y no puede descuadrar la fila entera.
 */
export function cuerpoDelPrecio(importe: string, dense: boolean): string {
  const largo = importe.length
  if (largo <= 12) return dense ? 'text-lg' : 'text-xl'
  if (largo <= 14) return dense ? 'text-sm' : 'text-base'
  return dense ? 'text-xs' : 'text-sm'
}
