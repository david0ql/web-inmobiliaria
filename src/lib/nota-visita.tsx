import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface NotaVisita {
  nota: string
  /** Deja una nota para el formulario de visita y lleva la vista hasta él. */
  proponer: (nota: string) => void
  /** La quita: quien la puso puede arrepentirse sin borrar texto a mano. */
  limpiar: () => void
  /** Sube cada vez que se propone una, para que el formulario pueda avisar. */
  sello: number
}

const NotaContext = createContext<NotaVisita | null>(null)

/**
 * Lo que el visitante trae pensado, camino del formulario de visita.
 *
 * El simulador de pagos y el formulario están en columnas distintas de la
 * misma pantalla, así que hace falta un sitio donde uno deje el mensaje y el
 * otro lo recoja. Va por contexto y no por la URL: es texto largo, cambia con
 * cada toque de los botones y no tiene ningún sentido que se pueda compartir
 * por enlace.
 *
 * Y no se envía solo: aterriza en el campo de mensaje, a la vista y editable.
 * Mandar en nombre de alguien un texto que no ha leído es justo lo que hace
 * que un formulario deje de ser suyo.
 */
export function NotaVisitaProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [nota, setNota] = useState('')
  const [sello, setSello] = useState(0)

  const proponer = useCallback((texto: string) => {
    setNota(texto)
    // El sello cambia aunque el texto sea el mismo: pulsar dos veces con las
    // mismas cifras tiene que volver a avisar, o el boton parece roto.
    setSello((previo) => previo + 1)

    /*
      Centrado y no `start`: el formulario vive en una columna pegajosa que ya
      suele estar a la vista, asi que alinearlo arriba movia la pagina cuatro
      pixeles y el gesto se sentia como que no habia pasado nada. Centrado, el
      formulario queda claramente en medio de la pantalla.
    */
    requestAnimationFrame(() => {
      document
        .getElementById('agendar')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const limpiar = useCallback(() => setNota(''), [])

  const valor = useMemo(
    () => ({ nota, proponer, limpiar, sello }),
    [nota, proponer, limpiar, sello],
  )

  return <NotaContext.Provider value={valor}>{children}</NotaContext.Provider>
}

export function useNotaVisita(): NotaVisita {
  return (
    useContext(NotaContext) ?? {
      nota: '',
      proponer: () => {},
      limpiar: () => {},
      sello: 0,
    }
  )
}
