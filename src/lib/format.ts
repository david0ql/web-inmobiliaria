/**
 * Formatos locales. Todo el inventario esta en pesos colombianos y en metros
 * cuadrados, asi que las funciones asumen ese contexto en lugar de arrastrar
 * una moneda por cada llamada.
 *
 * Es el mismo modulo que usa el panel (web/src/lib/format.ts), recortado a lo
 * que necesita un sitio publico: aqui no hay bitacoras ni fechas relativas.
 *
 * Dos reglas mandan sobre todo lo de aqui:
 *
 * 1. El IDIOMA del formato es el del sitio: `/venta` se lee en español y
 *    `/en/venta` en ingles, asi que las cantidades y las fechas se escriben en
 *    el idioma que se esta leyendo —"12 de agosto" o "August 12"—.
 * 2. El DINERO no sigue al idioma: sigue a la MONEDA. Un precio en pesos se
 *    escribe como se escriben los pesos ($1.750.000.000) lo lea quien lo lea,
 *    y uno en dolares como se escriben los dolares (US$425,000). Cambiar el
 *    separador de un precio en pesos porque la pagina esta en ingles no lo
 *    hace mas claro: lo convierte en otra cifra.
 */

import type { Idioma } from '@/lib/i18n'

/** El idioma del sitio en el identificador que entiende `Intl`. */
export const LOCALE: Record<Idioma, string> = {
  es: 'es-CO',
  en: 'en-US',
}

/**
 * La zona horaria de todo lo que se pinta, en cualquier idioma y desde
 * cualquier pais.
 *
 * La agenda es la de la oficina de Bucaramanga: una visita a las 10 esta a las
 * 10 en la oficina, y eso es lo que tiene que leer quien la reserva, este donde
 * este su reloj. Traducirle la hora a su huso solo consigue que se presente a
 * otra hora.
 */
export const ZONA = 'America/Bogota'

/*
  Los pesos, siempre en colombiano; los dolares, siempre en estadounidense.
  Es la regla 2 de arriba, en dos constantes.
*/
const COP = new Intl.NumberFormat(LOCALE.es, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const PESOS = new Intl.NumberFormat(LOCALE.es, { maximumFractionDigits: 0 })
const DOLARES = new Intl.NumberFormat(LOCALE.en, { maximumFractionDigits: 0 })

/** Las cantidades que no son dinero —m², alcobas, resultados— sí van al idioma. */
const CUENTA: Record<Idioma, Intl.NumberFormat> = {
  es: new Intl.NumberFormat(LOCALE.es, { maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat(LOCALE.en, { maximumFractionDigits: 0 }),
}

/**
 * Una cifra con decimal si lo tiene: `2,5 km` en español, `2.5 km` en ingles.
 *
 * `number()` redondea a entero —lo que quiere una cuenta de alcobas o de
 * resultados— y con el, un radio de 2,5 km se rotulaba "3 km" sobre un circulo
 * que medía 2,5: el mapa decia una cosa y el numero otra.
 */
const DECIMAL: Record<Idioma, Intl.NumberFormat> = {
  es: new Intl.NumberFormat(LOCALE.es, { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat(LOCALE.en, { maximumFractionDigits: 1 }),
}

export function decimal(value: number, idioma: Idioma): string {
  return DECIMAL[idioma].format(value)
}

/** Una cifra en pesos, sin simbolo: `1.750.000.000`. */
export function pesos(value: number): string {
  return PESOS.format(value)
}

/** Una cifra en dolares, sin simbolo: `425,000`. */
export function dolares(value: number): string {
  return DOLARES.format(value)
}

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
  return `$${PESOS.format(n)}`
}

/** Version corta para tarjetas y ejes: 430 M, 1.250 M. */
export function moneyShort(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return '—'
  if (n >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1)} MM`
  if (n >= 1_000_000) return `$${PESOS.format(Math.round(n / 1_000_000))} M`
  if (n >= 1_000) return `$${PESOS.format(Math.round(n / 1_000))} K`
  return `$${PESOS.format(n)}`
}

export function number(
  value: number | string | null | undefined,
  idioma: Idioma,
): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return CUENTA[idioma].format(n)
}

export function area(value: number | null | undefined, idioma: Idioma): string {
  if (value === null || value === undefined) return '—'
  return `${CUENTA[idioma].format(value)} m²`
}

// --- fechas ----------------------------------------------------------------

/*
  Un formateador por idioma y juego de opciones, guardado: montar un
  `Intl.DateTimeFormat` no es gratis y estas listas repintan cada celda del
  calendario. Antes eran constantes de modulo, que es lo mismo pero sin poder
  cambiar de idioma.
*/
const FECHAS = new Map<string, Intl.DateTimeFormat>()

/**
 * El formateador de fechas del idioma pedido, siempre en la hora de Bogotá.
 *
 * La zona no es un parametro a proposito: no hay ninguna fecha en este sitio
 * que deba leerse en otro huso.
 */
export function fechaFormat(
  idioma: Idioma,
  opciones: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const clave = `${idioma}|${JSON.stringify(opciones)}`
  let formato = FECHAS.get(clave)
  if (!formato) {
    formato = new Intl.DateTimeFormat(LOCALE[idioma], {
      timeZone: ZONA,
      ...opciones,
    })
    FECHAS.set(clave, formato)
  }
  return formato
}

/**
 * Un `YYYY-MM-DD` como el instante que cae a mediodia UTC de ese dia.
 *
 * Las fechas de la agenda son dias del calendario, no instantes: `2026-08-12`
 * es el 12 de agosto en Bucaramanga. Pasarlas por `new Date(y, m, d)` las ata
 * al reloj de quien mira, y formatearlas luego en Bogotá corre el dia hacia
 * atras para media Europa. El mediodia UTC cae dentro del mismo dia en
 * cualquier huso, asi que sale el 12 en todas partes.
 */
export function diaDe(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
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
