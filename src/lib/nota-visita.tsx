import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface NotaVisita {
  nota: string
  /** Deja una nota para el formulario de visita y lleva la vista hasta él. */
  proponer: (nota: string) => void
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

  const proponer = useCallback((texto: string) => {
    setNota(texto)
    // El formulario vive arriba a la derecha en escritorio y abajo del todo en
    // móvil: sin llevar la vista, en móvil no pasa nada visible al pulsar.
    document
      .getElementById('agendar')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const valor = useMemo(() => ({ nota, proponer }), [nota, proponer])

  return <NotaContext.Provider value={valor}>{children}</NotaContext.Provider>
}

export function useNotaVisita(): NotaVisita {
  return useContext(NotaContext) ?? { nota: '', proponer: () => {} }
}
