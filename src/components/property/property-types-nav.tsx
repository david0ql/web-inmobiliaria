import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/common/section-heading'
import { menuTypes, typePath, useSiteData } from '@/lib/site-data'

/**
 * Los tipos de inmueble, al pie de la portada.
 *
 * Es navegación de rescate: quien bajó hasta aquí sin encontrar lo suyo todavía
 * tiene un camino —«apartamentos», «lotes»— en lugar del pie de página y una
 * pestaña que se cierra. Arriba no cabía sin empujar el inventario fuera de la
 * pantalla, y arriba ya está el buscador, que hace lo mismo con más precisión.
 *
 * Cada enlace lleva el tipo en el segmento legible y en la query, así que la
 * página de destino no tiene que resolverlo contra el catálogo antes de buscar.
 */
export function PropertyTypesNav() {
  const data = useSiteData()
  const types = menuTypes(data)

  if (!types.length) return null

  return (
    <section className="border-t bg-secondary/40 py-10">
      <div className="container-site">
        <SectionHeading size="sm" light="Busca por" strong="tipo de inmueble" />
        <ul className="flex flex-wrap gap-2">
          {types.map((type) => (
            <li key={type.id}>
              <Link
                to={typePath(type)}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm transition-colors hover:bg-secondary"
              >
                {type.name}
                <span className="tabular text-xs text-muted-foreground">
                  {type.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
