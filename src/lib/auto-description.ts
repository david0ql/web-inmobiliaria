import {
  area as fmtArea,
  price as fmtPrice,
  stratumText,
  type Traducir,
} from './format'
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
 *
 * Se arma frase a frase con `t` porque cada idioma ordena distinto: la clave
 * lleva la frase entera y los datos entran por sus marcadores.
 */
export function autoDescription(property: Property, t: Traducir): string {
  const tipo = property.propertyType?.name ?? t('catalog.property.default_type')
  const lugar = [property.zone?.name, property.city?.name]
    .filter(Boolean)
    .join(', ')

  const frases: string[] = []

  frases.push(
    t('catalog.autodesc.headline', {
      tipo,
      lugar: lugar ? t('catalog.autodesc.headline.place', { lugar }) : '',
      area: property.area
        ? t('catalog.autodesc.headline.area', { area: fmtArea(property.area) })
        : '',
    }),
  )

  // Lo que la gente compara primero, en una sola frase.
  const partes: string[] = []
  if (property.bedrooms) partes.push(frase(t, 'catalog.autodesc.bedrooms', property.bedrooms))
  if (property.bathrooms) partes.push(frase(t, 'catalog.autodesc.bathrooms', property.bathrooms))
  if (property.garages) partes.push(frase(t, 'catalog.autodesc.garages', property.garages))
  if (partes.length)
    frases.push(t('catalog.autodesc.has', { lista: enumerar(partes, t) }))

  const contexto: string[] = []
  const estrato = stratumText(property.stratum, t)
  if (estrato) contexto.push(estrato.toLowerCase())
  if (property.buildingYear)
    contexto.push(t('catalog.autodesc.built_year', { year: property.buildingYear }))
  if (property.floor) contexto.push(t('catalog.autodesc.floor', { floor: property.floor }))
  if (contexto.length) {
    frases.push(`${capitalizar(enumerar(contexto, t))}.`)
  }

  // Como mucho seis: la lista entera de una casa con cuarenta caracteristicas
  // deja de leerse y pasa a ser ruido para el buscador.
  const caracteristicas = (property.features ?? [])
    .map((f) => f.name)
    .slice(0, 6)
  if (caracteristicas.length) {
    frases.push(
      t('catalog.autodesc.includes', {
        lista: enumerar(caracteristicas, t).toLowerCase(),
      }),
    )
  }

  const precio = property.salePrice ?? property.rentPrice
  if (precio) {
    frases.push(
      t('catalog.autodesc.price', {
        precio: fmtPrice(precio),
        moneda: property.currency?.iso ?? 'COP',
      }),
    )
  }

  frases.push(t('catalog.autodesc.closing', { code: property.code }))

  return frases.join(' ')
}

function frase(t: Traducir, base: string, n: number): string {
  return t(`${base}.${n === 1 ? 'one' : 'other'}`, { n })
}

/** "a, b y c" — con la y final, que es como se lee en voz alta. */
function enumerar(partes: string[], t: Traducir): string {
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} ${t('catalog.list.and')} ${partes.at(-1)}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
