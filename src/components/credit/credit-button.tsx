import { lazy, Suspense, useState } from 'react'

/*
  Mismo truco que `OfferButton`: el modal de credito arrastra react-hook-form,
  zod, el resolver y el dialogo de Radix, y esta en el menu de todas las
  paginas. Lo que se envia siempre es el disparador; el formulario se pide al
  pulsar — y tambien al pasar el raton o al enfocar con el teclado, que da unos
  200 ms de ventaja y hace que al hacer clic ya este cargado.
*/
const CreditDialog = lazy(() =>
  import('@/components/credit/credit-dialog').then((m) => ({
    default: m.CreditDialog,
  })),
)

let preloaded: Promise<unknown> | null = null
const preload = () => {
  preloaded ??= import('@/components/credit/credit-dialog')
}

/**
 * "Créditos" no es un sitio del sitio, es algo que se hace: al pulsar abre la
 * consulta de viabilidad ahi mismo en vez de llevarse al visitante a otra
 * pantalla desde la que tendria que volver.
 *
 * El disparador lo pone quien lo usa (`children`), porque en la barra tiene que
 * parecer un enlace del menu y en el movil una fila de la lista.
 */
export function CreditButton({
  children,
  className,
  label = 'Créditos',
}: {
  children?: React.ReactNode
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)

  const trigger = children ?? (
    <button type="button" className={className}>
      {label}
    </button>
  )

  if (open) {
    return (
      <Suspense fallback={trigger}>
        <CreditDialog defaultOpen onOpenChange={setOpen}>
          {trigger}
        </CreditDialog>
      </Suspense>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onMouseEnter={preload}
      onFocus={preload}
      onClick={() => {
        preload()
        setOpen(true)
      }}
    >
      {children ?? label}
    </button>
  )
}
