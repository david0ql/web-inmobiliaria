import { lazy, Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'

/*
  El modal de ofertar vive en el pie, y el pie esta en todas las paginas. Cargarlo
  de forma normal mete react-hook-form, zod, el resolver y el dialogo de Radix en
  el trozo principal — codigo que la inmensa mayoria de visitantes no llega a
  ejecutar nunca.

  Asi que el boton es lo unico que se envia siempre; el formulario entero se pide
  al pulsarlo, y tambien al pasar el raton por encima, que da unos 200 ms de
  ventaja y hace que al hacer clic ya este.
*/
const OfferDialog = lazy(() =>
  import('@/components/layout/offer-dialog').then((m) => ({
    default: m.OfferDialog,
  })),
)

let preloaded: Promise<unknown> | null = null
const preload = () => {
  preloaded ??= import('@/components/layout/offer-dialog')
}

export function OfferButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <Suspense
        fallback={
          <Button className={className} disabled>
            OFERTAR
          </Button>
        }
      >
        <OfferDialog defaultOpen onOpenChange={setOpen}>
          <Button className={className}>OFERTAR</Button>
        </OfferDialog>
      </Suspense>
    )
  }

  return (
    <Button
      className={className}
      onMouseEnter={preload}
      onFocus={preload}
      onClick={() => {
        preload()
        setOpen(true)
      }}
    >
      OFERTAR
    </Button>
  )
}
