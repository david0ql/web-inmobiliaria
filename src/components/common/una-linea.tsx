import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Texto que ocupa exactamente una linea, con puntos suspensivos si no cabe.
 *
 * Los titulos y la linea de ubicacion de las tarjetas iban a dos lineas. En una
 * rejilla eso significa que la tarjeta cuyo titulo cabe en una linea mide menos
 * que la de al lado, el precio de cada una queda a una altura distinta y la fila
 * entera se ve como un diente de sierra. La rejilla se compara con la vista: si
 * las filas no se alinean, comparar cuesta trabajo.
 *
 * A una linea todas las tarjetas miden lo mismo, y lo que se pierde —el final de
 * un titulo largo— se recupera al pasar el raton.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE EL `title` SE PONE AL ENTRAR EL RATON Y NO EN EL HTML
 *
 * `title` fijo saldria tambien sobre el texto que se ve entero, y un globo que
 * repite palabra por palabra lo que hay debajo es ruido. Al entrar el raton se
 * mira si de verdad sobra texto (`scrollWidth > clientWidth`) y solo entonces se
 * pone el atributo. La comprobacion es una lectura de layout por hover, sobre un
 * elemento concreto: no es un coste que se note.
 *
 * El globo nativo y no uno propio a proposito: no hay que montar nada, respeta
 * el tema del sistema y en tactil —donde no hay hover— no estorba, porque ahi
 * simplemente no aparece.
 */
export function UnaLinea({
  as: Como = 'span',
  texto,
  children,
  className,
}: {
  as?: ElementType
  /**
   * El texto completo, en plano, para el globo.
   *
   * Va aparte de `children` porque los hijos pueden llevar un enlace dentro y de
   * un arbol de React no se saca texto para un atributo.
   */
  texto: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Como
      className={cn('block truncate', className)}
      onMouseEnter={(evento: React.MouseEvent<HTMLElement>) => {
        const nodo = evento.currentTarget
        if (nodo.scrollWidth > nodo.clientWidth) nodo.title = texto
        else nodo.removeAttribute('title')
      }}
    >
      {children ?? texto}
    </Como>
  )
}
