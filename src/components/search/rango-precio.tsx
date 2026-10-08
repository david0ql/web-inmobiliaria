import { useId } from 'react'

import { useIdioma, useT } from '@/lib/i18n'

/**
 * El precio, como un rango que se arrastra.
 *
 * Antes eran dos casillas, "Desde" y "Hasta", donde habia que teclear
 * 320000000 — nueve digitos sin separadores, porque un campo numerico no los
 * admite mientras se escribe—. Nadie sabe de memoria cuantos ceros lleva su
 * presupuesto, y un cero de mas o de menos no da error: devuelve una lista
 * vacia o el inventario entero, y en ninguno de los dos casos se entiende por
 * que.
 *
 * Un rango no deja teclear mal. Y habla en millones, que es como se habla de
 * precios de vivienda en Colombia: "entre 320 y 455 millones" es una frase que
 * alguien diria en voz alta; "$320.000.000 – $455.000.000" es un extracto
 * bancario.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE DOS `input type=range` SUPERPUESTOS Y NO UNA LIBRERIA
 *
 * Un control de dos pulgares no existe en HTML, y las librerias que lo traen
 * pesan mas que todo este formulario. Dos deslizadores nativos encima del mismo
 * carril dan lo mismo y heredan gratis lo dificil: el teclado, el foco, el
 * gesto tactil y el lector de pantalla.
 *
 * Lo unico que hay que resolver es que el carril de uno no tape el pulgar del
 * otro: por eso los dos tienen `pointer-events: none` y solo sus pulgares los
 * recuperan. Sin eso, el deslizador de arriba se come los clics del de abajo en
 * toda la mitad que comparten.
 */

/** Lo mas barato publicado, redondeado hacia abajo. */
const MINIMO = 50_000_000
/*
  El tope del control. El inventario llega a 18.000 millones, pero el 95% esta
  por debajo de 1.400: estirar el carril hasta el maximo real dejaria todo el
  catalogo apelotonado en el primer centimetro. Pasado el tope, el rango deja de
  acotar por arriba — "desde 2.000 millones" es, de hecho, lo que se quiere.
*/
const MAXIMO = 2_000_000_000
/** Se mueve de millon en millon: es la unidad en que se piensa el precio. */
const PASO = 1_000_000

/** "455 millones", o "2.000 millones o más" cuando toca el tope. */
function enMillones(valor: number, idioma: string, t: ReturnType<typeof useT>): string {
  const millones = Math.round(valor / 1_000_000)
  const cifra = new Intl.NumberFormat(idioma === 'en' ? 'en-US' : 'es-CO').format(
    millones,
  )
  return t('search.price.millions', { value: cifra })
}

export function RangoPrecio({
  min,
  max,
  onChange,
  className = '',
}: {
  /** Vacio significa "sin tope por ese lado". */
  min: string
  max: string
  onChange: (min: string, max: string) => void
  className?: string
}) {
  const t = useT()
  const { idioma } = useIdioma()
  const id = useId()

  const desde = min ? Number(min) : MINIMO
  const hasta = max ? Number(max) : MAXIMO

  const porcentaje = (valor: number) =>
    ((valor - MINIMO) / (MAXIMO - MINIMO)) * 100

  /*
    Los pulgares no se cruzan. Arrastrar el de la izquierda por encima del de la
    derecha dejaria un rango invertido —"de 800 a 300"— que la API devuelve
    vacio sin explicar nada.
  */
  const moverDesde = (valor: number) => {
    const nuevo = Math.min(valor, hasta - PASO)
    onChange(nuevo <= MINIMO ? '' : String(nuevo), max)
  }
  const moverHasta = (valor: number) => {
    const nuevo = Math.max(valor, desde + PASO)
    onChange(min, nuevo >= MAXIMO ? '' : String(nuevo))
  }

  const etiqueta =
    hasta >= MAXIMO
      ? t('search.price.from_only', {
          value: enMillones(desde, idioma, t),
        })
      : `${enMillones(desde, idioma, t)} – ${enMillones(hasta, idioma, t)}`

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
          {t('search.field.price')}
        </span>
        <span className="tabular text-xs font-medium">{etiqueta}</span>
      </div>

      <div className="relative h-9">
        {/* El carril, y encima el tramo elegido. */}
        <span className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-secondary" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{
            left: `${porcentaje(desde)}%`,
            right: `${100 - porcentaje(hasta)}%`,
          }}
        />

        <input
          id={`${id}-desde`}
          type="range"
          min={MINIMO}
          max={MAXIMO}
          step={PASO}
          value={desde}
          onChange={(event) => moverDesde(Number(event.target.value))}
          aria-label={t('search.field.minPrice')}
          className="rango-precio absolute inset-0 w-full"
        />
        <input
          id={`${id}-hasta`}
          type="range"
          min={MINIMO}
          max={MAXIMO}
          step={PASO}
          value={hasta}
          onChange={(event) => moverHasta(Number(event.target.value))}
          aria-label={t('search.field.maxPrice')}
          className="rango-precio absolute inset-0 w-full"
        />
      </div>
    </div>
  )
}
