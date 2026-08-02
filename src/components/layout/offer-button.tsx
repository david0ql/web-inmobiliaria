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
  import('@/components/consignment/consignment-dialog').then((m) => ({
    default: m.ConsignmentDialog,
  })),
)

let preloaded: Promise<unknown> | null = null
const preload = () => {
  preloaded ??= import('@/components/consignment/consignment-dialog')
}

export function OfferButton({
  className,
  label = 'Publica tu inmueble',
  variant,
  size,
}: {
  className?: string
  label?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
}) {
  const [open, setOpen] = useState(false)
  const trigger = (
    <Button className={className} variant={variant} size={size}>
      {label}
    </Button>
  )

  if (open) {
    return (
      <Suspense fallback={trigger}>
        <OfferDialog defaultOpen onOpenChange={setOpen}>
          {trigger}
        </OfferDialog>
      </Suspense>
    )
  }

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      onMouseEnter={preload}
      onFocus={preload}
      onClick={() => {
        preload()
        setOpen(true)
      }}
    >
      {label}
    </Button>
  )
}
