import { area as fmtArea, price as fmtPrice, stratumLabel } from './format'
import type { Property } from './types'

/**
 * La descripción del inmueble, escrita con sus propios datos.
 *
 * Los portales y las redes la exigen, y la que traía cada ficha desde WASI es
 * texto libre: unas tienen tres líneas, otras un párrafo copiado del anuncio de
 * otra agencia, y ninguna garantiza que aparezcan el área, las alcobas o el
 * barrio. Esta se arma de la ficha, así que siempre están.
 *
 * No sustituye a la del asesor: va primero la automática —completa y
 * comprobable— y debajo la suya, que es donde caben las cosas que no están en
 * ningún campo ("la terraza da al parque").
 */
export function autoDescription(property: Property): string {
  const tipo = property.propertyType?.name ?? 'Inmueble'
  const lugar = [property.zone?.name, property.city?.name]
    .filter(Boolean)
    .join(', ')

  const frases: string[] = []

  frases.push(
    `${tipo} en venta${lugar ? ` en ${lugar}` : ''}` +
      (property.area ? ` de ${fmtArea(property.area)}` : '') +
      '.',
  )

  // Lo que la gente compara primero, en una sola frase.
  const partes: string[] = []
  if (property.bedrooms) partes.push(frase(property.bedrooms, 'alcoba', 'alcobas'))
  if (property.bathrooms) partes.push(frase(property.bathrooms, 'baño', 'baños'))
  if (property.garages) partes.push(frase(property.garages, 'garaje', 'garajes'))
  if (partes.length) frases.push(`Cuenta con ${enumerar(partes)}.`)

  const contexto: string[] = []
  const estrato = stratumLabel(property.stratum).replace(' · ', '')
  if (estrato) contexto.push(estrato.startsWith('Estrato') ? estrato.toLowerCase() : estrato.toLowerCase())
  if (property.buildingYear) contexto.push(`construido en ${property.buildingYear}`)
  if (property.floor) contexto.push(`piso ${property.floor}`)
  if (contexto.length) {
    frases.push(`${capitalizar(enumerar(contexto))}.`)
  }

  // Como mucho seis: la lista entera de una casa con cuarenta caracteristicas
  // deja de leerse y pasa a ser ruido para el buscador.
  const caracteristicas = (property.features ?? [])
    .map((f) => f.name)
    .slice(0, 6)
  if (caracteristicas.length) {
    frases.push(`Incluye ${enumerar(caracteristicas).toLowerCase()}.`)
  }

  const precio = property.salePrice ?? property.rentPrice
  if (precio) {
    frases.push(
      `Precio: ${fmtPrice(precio)} ${property.currency?.iso ?? 'COP'}.`,
    )
  }

  frases.push(
    `Código ${property.code}. Agenda tu visita en línea o escríbenos y un asesor te acompaña.`,
  )

  return frases.join(' ')
}

function frase(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** "a, b y c" — con la y final, que es como se lee en voz alta. */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
