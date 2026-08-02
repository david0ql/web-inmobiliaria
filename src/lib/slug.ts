/**
 * Los inmuebles no tienen slug en la base: la API los busca por `code`. El
 * segmento legible de la URL es decorativo, igual que en el sitio actual
 * (`/casa-campestre-venta-los-colorados-piedecuesta/9009194`), y se calcula
 * aqui a partir de tipo + operacion + barrio + ciudad.
 *
 * Misma normalizacion que `slugify()` en api/src/modules/properties/families.service.ts,
 * para que los slugs de proyecto y los de inmueble no diverjan.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 220)
}

interface Sluggable {
  code: string
  propertyType?: { name: string } | null
  zone?: { name: string } | null
  city?: { name: string } | null
  forSale?: boolean
  forRent?: boolean
}

/** `/casa-campestre-venta-los-colorados-piedecuesta/9009194` */
export function propertyPath(property: Sluggable): string {
  const parts = [
    property.propertyType?.name,
    property.forSale ? 'venta' : property.forRent ? 'arriendo' : null,
    property.zone?.name,
    property.city?.name,
  ].filter(Boolean) as string[]

  const slug = slugify(parts.join(' ')) || 'inmueble'
  return `/${slug}/${property.code}`
}
