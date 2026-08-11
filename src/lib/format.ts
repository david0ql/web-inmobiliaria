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

// --- etiquetas del dominio -------------------------------------------------

/**
 * La firma de `useT()`. Las etiquetas del dominio viven en constantes de modulo
 * —fuera de todo componente— asi que guardan la CLAVE y se traducen en el punto
 * donde se pintan, con la `t` que el componente ya tiene.
 */
export type Traducir = (
  key: string,
  vars?: Record<string, string | number>,
  /** Qué pintar si la clave no existe: lo usan los nombres de catálogo. */
  fallback?: string,
) => string

export const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: 'catalog.availability.available',
  RESERVED: 'catalog.availability.reserved',
  SOLD: 'catalog.availability.sold',
  RENTED: 'catalog.availability.rented',
  WITHDRAWN: 'catalog.availability.withdrawn',
}

/** Los colores son los que la agencia ya usaba en WASI para sus etiquetas. */
/**
 * Colores de la etiqueta de estado.
 *
 * Son los de WASI oscurecidos hasta pasar el contraste AA sobre texto blanco:
 * el verde original (#6aa84f) daba 2,87:1 y el ambar (#f1c232) 1,68:1, muy por
 * debajo del 4,5:1 exigido. Se conserva el tono para que la etiqueta se siga
 * reconociendo de un vistazo.
 */
export const AVAILABILITY_COLOR: Record<string, string> = {
  AVAILABLE: '#2f7d4f', // 5,04:1
  RESERVED: '#8a6209', // 5,48:1
  SOLD: '#a81c1c', // 7,37:1
  RENTED: '#8a6209', // 5,48:1
  WITHDRAWN: '#6b6b6b', // 5,33:1
}

export const CONDITION_LABEL: Record<string, string> = {
  NEW: 'catalog.condition.new',
  USED: 'catalog.condition.used',
  PROJECT: 'catalog.condition.plans',
  UNDER_CONSTRUCTION: 'catalog.condition.under_construction',
}

export const RENT_PERIOD_LABEL: Record<string, string> = {
  DAILY: 'catalog.rent_period.daily',
  WEEKLY: 'catalog.rent_period.weekly',
  BIWEEKLY: 'catalog.rent_period.biweekly',
  MONTHLY: 'catalog.rent_period.monthly',
  ANNUAL: 'catalog.rent_period.annual',
}

/**
 * Como el sitio nombra la operacion. En la base no hay un enum: son cuatro
 * booleanos que pueden darse a la vez.
 */
export function businessType(
  p: {
    forSale?: boolean
    forRent?: boolean
    forTransfer?: boolean
    forTemporaryRent?: boolean
  },
  t: Traducir,
): string {
  const parts: string[] = []
  if (p.forSale) parts.push(t('catalog.business.sale'))
  if (p.forRent) parts.push(t('catalog.business.rent'))
  if (p.forTemporaryRent) parts.push(t('catalog.business.temporary_rent'))
  if (p.forTransfer) parts.push(t('catalog.business.transfer'))
  return parts.join(' / ') || '—'
}

/**
 * El estrato, como se dice en Colombia.
 *
 * La escala oficial va del 1 al 6. WASI usaba los dos siguientes para lo que no
 * encaja en ella, y al importarlo se colaron tal cual: la web enseñaba "Estrato
 * 8" en una bodega, que no significa nada para nadie. Los 23 inmuebles con un 8
 * son bodegas, locales, oficinas y consultorios — comercial.
 *
 * Devuelve la cadena completa con su separador, o vacío si no hay dato: quien
 * lo usa lo concatena sin tener que comprobar nada.
 */
export function stratumLabel(
  stratum: number | null | undefined,
  t: Traducir,
): string {
  const texto = stratumText(stratum, t)
  return texto ? ` · ${texto}` : ''
}

/** Lo mismo sin el separador, para cuando va en una frase o en una celda. */
export function stratumText(
  stratum: number | null | undefined,
  t: Traducir,
): string {
  if (!stratum) return ''
  if (stratum === 7) return t('catalog.stratum.rural')
  if (stratum >= 8) return t('catalog.stratum.commercial')
  return t('catalog.stratum.value', { n: stratum })
}

/** Solo el valor: la tabla de detalles ya lleva "Estrato" en su etiqueta. */
export function stratumShort(
  stratum: number | null | undefined,
  t: Traducir,
): string {
  if (!stratum) return ''
  if (stratum === 7) return t('catalog.stratum.rural')
  if (stratum >= 8) return t('catalog.stratum.commercial')
  return String(stratum)
}
