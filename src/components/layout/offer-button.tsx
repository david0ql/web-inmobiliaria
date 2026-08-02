import { lazy, Suspense, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { usePortalClient } from '@/lib/use-portal'

/*
  El modal de publicar vive en el pie, y el pie esta en todas las paginas. Cargarlo
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

const AccountDialog = lazy(() =>
  import('@/components/account/account-dialog').then((m) => ({
    default: m.AccountDialog,
  })),
)

let preloaded: Promise<unknown> | null = null
const preload = () => {
  preloaded ??= import('@/components/consignment/consignment-dialog')
}

/**
 * "Publica tu inmueble".
 *
 * Pide sesion antes de abrir el formulario. No es un tramite: un inmueble
 * publicado tiene dueño, y ese dueño necesita una cuenta desde la que despues
 * siga sus visitas y hable con la agencia. Rellenar treinta campos y descubrir
 * al final que ademas hay que registrarse es la forma segura de que nadie lo
 * termine.
 *
 * Con sesion, el formulario se salta el paso "Tus datos" —la API los toma de la
 * cuenta— asi que entrar antes tambien lo hace mas corto.
 */
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
  const client = usePortalClient()
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)

  // Al entrar se sigue donde se estaba: se cierra la entrada y se abre el
  // formulario, sin volver a pulsar nada.
  useEffect(() => {
    if (!asking || !client) return
    setAsking(false)
    preload()
    setOpen(true)
  }, [asking, client])

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
    <>
      <Button
        className={className}
        variant={variant}
        size={size}
        onMouseEnter={preload}
        onFocus={preload}
        onClick={() => {
          if (!client) {
            setAsking(true)
            return
          }
          preload()
          setOpen(true)
        }}
      >
        {label}
      </Button>

      {asking && (
        <Suspense fallback={null}>
          <AccountDialog open onOpenChange={setAsking} />
        </Suspense>
      )}
    </>
  )
}
