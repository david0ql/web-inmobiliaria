import { useEffect } from 'react'

import { applyJsonLd, applyMeta, type Meta } from '@/lib/seo'

/**
 * Aplica los metadatos y los datos estructurados de una ruta.
 *
 * Se hace en un efecto y no al renderizar porque tocar el `<head>` durante el
 * render es un efecto secundario: con StrictMode en desarrollo se ejecutaria
 * dos veces y en concurrent React podria hacerlo sobre un arbol que luego se
 * descarta.
 *
 * Los bloques se identifican por nombre para que cada ruta reemplace el suyo
 * al entrar y lo retire al salir: sin eso, navegar de una ficha a otra dejaria
 * los datos de la anterior en la pagina.
 */
export function useSeo(meta: Meta, jsonLd: Record<string, unknown> = {}) {
  // Las dependencias van serializadas: los objetos se recrean en cada render y
  // compararlos por referencia dispararia el efecto siempre.
  const metaKey = JSON.stringify(meta)
  const jsonKey = JSON.stringify(jsonLd)

  useEffect(() => {
    applyMeta(JSON.parse(metaKey) as Meta)

    const blocks = JSON.parse(jsonKey) as Record<string, unknown>
    for (const [id, data] of Object.entries(blocks)) applyJsonLd(id, data)

    return () => {
      for (const id of Object.keys(blocks)) applyJsonLd(id, null)
    }
  }, [metaKey, jsonKey])
}
