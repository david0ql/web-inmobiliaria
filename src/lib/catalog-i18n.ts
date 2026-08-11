import { useT } from '@/lib/i18n'
import type { Feature, Property, PropertyType } from '@/lib/types'

/**
 * Los nombres que vienen de la base, en el idioma que toque.
 *
 * "Casa Campestre", "Vigilancia", "Parqueadero visitantes" no son texto del
 * código: son filas de catálogo que la agencia puede cambiar. Aquí se traducen
 * por identificador —`catalog.propertyType.11`— y no por su texto, porque si
 * alguien corrige una tilde en el panel de inmuebles, la traducción no se debe
 * perder.
 *
 * Si no hay traducción se enseña el nombre de la base: un tipo nuevo se ve en
 * español, que es mucho mejor que ver la clave, y aparece en la pantalla de
 * textos como pendiente.
 */
export function useCatalogo() {
  const t = useT()

  const tipo = (type?: PropertyType | null): string | null =>
    type ? t(`catalog.propertyType.${type.id}`, undefined, type.name) : null

  const rasgo = (feature: Feature): string =>
    t(`catalog.feature.${feature.id}`, undefined, feature.name)

  /**
   * El título de un inmueble.
   *
   * En la base está escrito en español —"CASA CAMPESTRE EN VENTA EN MONTE
   * RUITOQUE RUITOQUE BAJO GIRON"— y no se puede traducir con un diccionario,
   * porque lleva dentro el nombre del conjunto y del barrio. Se arma de nuevo
   * con sus piezas: el tipo, que sí se traduce, la operación y el sitio, que
   * son nombres propios y se quedan como están.
   */
  const titulo = (property: Property): string => {
    const type = tipo(property.propertyType) ?? t('property.fallback.type')
    const place = [property.zone?.name, property.city?.name]
      .filter(Boolean)
      .join(', ')

    if (!place) return property.title

    return t(property.forRent ? 'property.title.rent' : 'property.title.sale', {
      type,
      place,
    })
  }

  return { tipo, rasgo, titulo }
}
