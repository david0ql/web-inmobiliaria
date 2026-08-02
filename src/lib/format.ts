/**
 * Formatos locales. Todo el inventario esta en pesos colombianos y en metros
 * cuadrados, asi que las funciones asumen ese contexto en lugar de arrastrar
 * una moneda por cada llamada.
 *
 * Es el mismo modulo que usa el panel (web/src/lib/format.ts), recortado a lo
 * que necesita un sitio publico: aqui no hay bitacoras ni fechas relativas.
 */

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const PLAIN = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function money(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return COP.format(n)
}

/**
 * El precio tal y como lo escribe el sitio actual: `$1.400.000.000` y la moneda
 * suelta al lado, en pequeño. Intl mete un espacio estrecho entre el simbolo y
 * la cifra que aqui sobra.
 */
export function price(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return '—'
  return `$${PLAIN.format(n)}`
}

/** Version corta para tarjetas y ejes: 430 M, 1.250 M. */
export function moneyShort(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return '—'
  if (n >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1)} MM`
  if (n >= 1_000_000) return `$${PLAIN.format(Math.round(n / 1_000_000))} M`
  if (n >= 1_000) return `$${PLAIN.format(Math.round(n / 1_000))} K`
  return `$${PLAIN.format(n)}`
}

export function number(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return PLAIN.format(n)
}

export function area(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${PLAIN.format(value)} m²`
}

/** Para el hueco de la foto del asesor cuando no la hay. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// --- etiquetas del dominio, en castellano ---------------------------------

export const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  RENTED: 'Arrendado',
  WITHDRAWN: 'Retirado',
}

/** Los colores son los que la agencia ya usaba en WASI para sus etiquetas. */
export const AVAILABILITY_COLOR: Record<string, string> = {
  AVAILABLE: '#6aa84f',
  RESERVED: '#f1c232',
  SOLD: '#cc0000',
  RENTED: '#f1c232',
  WITHDRAWN: '#767676',
}

export const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  USED: 'Usado',
  PROJECT: 'Sobre planos',
  UNDER_CONSTRUCTION: 'En construcción',
}

export const RENT_PERIOD_LABEL: Record<string, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

/**
 * Como el sitio nombra la operacion. En la base no hay un enum: son cuatro
 * booleanos que pueden darse a la vez.
 */
export function businessType(p: {
  forSale?: boolean
  forRent?: boolean
  forTransfer?: boolean
  forTemporaryRent?: boolean
}): string {
  const parts: string[] = []
  if (p.forSale) parts.push('Venta')
  if (p.forRent) parts.push('Arriendo')
  if (p.forTemporaryRent) parts.push('Arriendo temporal')
  if (p.forTransfer) parts.push('Permuta')
  return parts.join(' / ') || '—'
}
