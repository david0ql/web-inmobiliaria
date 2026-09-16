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
 *
 * Recibe una lista y no un plano suelto porque un duplex tiene dos plantas y un
 * apartamento con sotano tiene planta y sotano. Casi siempre sera uno, y con
 * uno se ve exactamente igual que si el componente no supiera contar.
 */
export function TypologyPlan({
  plans,
  title,
  owner = 'unitType',
}: {
  plans: PropertyImage[]
  title: string
  /**
   * De quien es el plano, que es lo unico que cambia el rotulo.
   *
   * Casi siempre de la tipologia. Pero un inmueble suelto —un lote con su
   * levantamiento— tambien puede tener el suyo, y ahi "Plano de la tipologia"
   * nombraria algo que ese inmueble no tiene.
   */
  owner?: 'unitType' | 'property'
}) {
  const t = useT()
  const [abierto, setAbierto] = useState<number | null>(null)

  // Hoy casi ninguna tipologia tiene plano cargado. Sin esto, cada proyecto
  // enseñaria un titulo con un rectangulo vacio debajo.
  if (!plans.length) return null

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
        <Ruler className="size-4 text-muted-foreground" aria-hidden="true" />
        {t(
          `${owner === 'property' ? 'property' : 'project'}.plan.title${
            plans.length > 1 ? '.other' : ''
          }`,
        )}
      </h2>

      {/*
        En fila y centrados. Con un plano da lo mismo; con dos, ponerlos uno al
        lado del otro es lo que deja comparar la planta con el sotano sin
        desplazar la pagina, que es para lo que estan los dos.
      */}
      <div className="flex flex-wrap items-start justify-center gap-3">
        {plans.map((plan, index) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setAbierto(index)}
            aria-label={t('project.plan.zoom', { title })}
            /*
              El marco se ajusta al plano y no al ancho de la columna. Un plano
              de apartamento suele ser mas alto que ancho, y estirando la caja a
              toda la columna quedaba una lamina blanca de dos palmos con el
              dibujo diminuto en el centro: el borde dejaba de rodear el plano
              para rodear el hueco.
            */
            className="group relative block max-w-full cursor-zoom-in overflow-hidden rounded-lg border bg-white"
          >
            <img
              src={plan.urlLarge || plan.url}
              alt={plan.description ?? t('project.plan.alt', { title })}
              loading="lazy"
              decoding="async"
              className="max-h-[460px] w-auto max-w-full object-contain p-2"
            />

            <span className="sr-only"><Expand aria-hidden="true" /></span>
          </button>
        ))}
      </div>

      {/* El aviso se lee siempre y no solo al pasar el raton: en un telefono no
          hay raton, y un plano de 460 px de alto no se puede leer sin ampliar. */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t('project.plan.hint')}
      </p>

      <Lightbox
        images={plans}
        index={abierto}
        onIndex={setAbierto}
        title={title}
      />
    </section>
  )
}
