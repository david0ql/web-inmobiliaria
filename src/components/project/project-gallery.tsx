import { Expand } from 'lucide-react'
import { useState } from 'react'

import { Lightbox } from '@/components/common/lightbox'
import { useT } from '@/lib/i18n'
import type { PropertyImage } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Las fotos del PROYECTO: la fachada, la piscina, el salon comunal.
 *
 * Son la tercera cosa de esta pagina y la que faltaba. Las otras dos ya
 * estaban: el plano dice como es por dentro la tipologia, y el mosaico de abajo
 * enseña el apartamento concreto que se ha elegido. Estas no cambian al cambiar
 * de unidad —el edificio es el mismo— y por eso van arriba del todo, antes de
 * elegir nada, que es donde estaba la portada sola hasta ahora.
 *
 * El rotulo sobre la foto grande no es decorativo: con tres bloques de imagenes
 * en la misma pagina, una foto de una piscina y una foto de un salon se
 * confunden si nada dice de que son. Solo aparece cuando hay galeria de verdad;
 * con una portada suelta, decir "1 foto del proyecto" no aclara nada que la
 * pagina no diga ya.
 *
 * Si el proyecto no tiene ni galeria ni portada no se pinta nada, ni un hueco
 * gris: hoy es el caso de casi todos.
 */
export function ProjectGallery({
  images,
  cover,
  name,
}: {
  images: PropertyImage[] | undefined
  /** La portada, cuando no hay galeria cargada. Ver `portada` en la pagina. */
  cover: string | null
  name: string
}) {
  const t = useT()
  const [actual, setActual] = useState(0)
  const [ampliada, setAmpliada] = useState<number | null>(null)

  /*
    Una portada suelta se envuelve como si fuera una foto mas: asi el visor a
    pantalla completa es el mismo codigo para los dos casos, y el dia que el
    proyecto tenga galeria esta rama deja de usarse sola.
  */
  const fotos: PropertyImage[] = images?.length
    ? images
    : cover
      ? [portadaComoFoto(cover, name)]
      : []

  if (!fotos.length) return null

  // Al llegar una galeria mas corta que el indice guardado —no pasa hoy, pero
  // el componente se remonta con la ficha— se cae a la primera en vez de a nada.
  const index = Math.min(actual, fotos.length - 1)
  const foto = fotos[index]

  return (
    <section>
      <h2 className="sr-only">{t('project.gallery.title', { name })}</h2>

      <button
        type="button"
        onClick={() => setAmpliada(index)}
        aria-label={t('project.cover.zoom', { name })}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border bg-secondary"
      >
        <img
          src={foto.urlLarge || foto.url}
          alt={foto.description ?? name}
          fetchPriority="high"
          className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
        />

        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
          <Expand className="size-6 text-white" aria-hidden="true" />
        </span>

        {fotos.length > 1 && (
          <span className="tabular absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            {t('project.gallery.badge', { total: fotos.length })}
          </span>
        )}
      </button>

      {/*
        La tira de miniaturas cambia la foto grande; no abre el visor. Es el
        mismo gesto que en la ficha de inmueble, donde la tira elige y la foto
        grande amplia: mezclarlo aqui obligaria a aprender dos galerias.
      */}
      {fotos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActual(i)}
              aria-label={t('project.card.photo.alt', {
                name,
                index: i + 1,
              })}
              aria-current={i === index}
              className={cn(
                'h-16 w-[90px] shrink-0 overflow-hidden rounded-md border-2 transition-opacity',
                i === index
                  ? 'border-primary'
                  : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img
                src={image.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        images={fotos}
        index={ampliada}
        onIndex={setAmpliada}
        title={name}
      />
    </section>
  )
}

/**
 * `coverUrl` es una URL a secas y el visor espera una foto con sus variantes.
 * Se rellena con la misma en todos los tamaños porque es la unica que hay: no
 * es una foto degradada, es que la portada no tiene mas versiones.
 */
function portadaComoFoto(cover: string, name: string): PropertyImage {
  return {
    id: 'portada',
    url: cover,
    urlMedium: cover,
    urlLarge: cover,
    urlOriginal: cover,
    description: name,
    position: 1,
    isMain: true,
    width: null,
    height: null,
  }
}
