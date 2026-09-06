import { Expand, Ruler } from 'lucide-react'
import { useState } from 'react'

import { Lightbox } from '@/components/common/lightbox'
import { useT } from '@/lib/i18n'
import type { PropertyImage } from '@/lib/types'

/**
 * El plano de la tipologia: la distribucion dibujada.
 *
 * No es una foto mas y por eso no entra en el mosaico de la unidad. Una foto se
 * mira; un plano se LEE —se cuentan las puertas, se busca donde da la ventana,
 * se mide si cabe la cama—, y para eso hacen falta dos cosas que el mosaico no
 * da: verlo entero y verlo grande.
 *
 * Entero, porque `object-contain` y no `cover`: recortar un plano por la mitad
 * para que cuadre una rejilla es recortar justo la habitacion que alguien
 * estaba buscando. Sobre blanco, porque un plano es tinta sobre papel y muchos
 * llegan como PNG con el fondo transparente: sobre el gris del panel, las
 * lineas finas se pierden.
 *
 * Y grande, porque se abre a pantalla completa con el mismo visor que las
 * fotos: quien ya aprendio a ampliar una foto de la ficha no tiene que aprender
 * otro gesto aqui.
 */
export function TypologyPlan({
  plan,
  title,
}: {
  plan: PropertyImage | null | undefined
  title: string
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)

  // Hoy no hay ninguna tipologia con plano cargado. Sin esto, cada proyecto
  // enseñaria un titulo con un rectangulo vacio debajo.
  if (!plan) return null

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
        <Ruler className="size-4 text-muted-foreground" aria-hidden="true" />
        {t('project.plan.title')}
      </h2>

      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={t('project.plan.zoom', { title })}
        /*
          El marco se ajusta al plano y no al ancho de la columna. Un plano de
          apartamento suele ser mas alto que ancho, y estirando la caja a toda
          la columna quedaba una lamina blanca de dos palmos con el dibujo
          diminuto en el centro: el borde dejaba de rodear el plano para rodear
          el hueco. `w-fit` lo devuelve a lo que mide.
        */
        className="group relative mx-auto block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-lg border bg-white"
      >
        <img
          src={plan.urlLarge || plan.url}
          alt={plan.description ?? t('project.plan.alt', { title })}
          loading="lazy"
          decoding="async"
          className="max-h-[460px] w-auto max-w-full object-contain p-2"
        />

        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
          <Expand className="size-6 text-white" aria-hidden="true" />
        </span>
      </button>

      {/* El aviso se lee siempre y no solo al pasar el raton: en un telefono no
          hay raton, y un plano de 460 px de alto no se puede leer sin ampliar. */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t('project.plan.hint')}
      </p>

      <Lightbox
        images={[plan]}
        index={abierto ? 0 : null}
        onIndex={(i) => setAbierto(i !== null)}
        title={title}
      />
    </section>
  )
}
