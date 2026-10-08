import { lazy, Suspense } from 'react'

import { cerrarPuertaMeGusta, usePuertaMeGusta } from '@/lib/me-gusta'

/*
  El dialogo trae el formulario de entrada y el de registro con su validacion:
  no puede viajar en el trozo principal por un boton que la mayoria de
  visitantes no llega a pulsar. Se pide cuando se abre.
*/
const AccountDialog = lazy(() =>
  import('@/components/account/account-dialog').then((m) => ({
    default: m.AccountDialog,
  })),
)

/**
 * La entrada que abre el corazon, UNA para toda la pagina.
 *
 * Se monta en la raiz. Dentro de `BotonMeGusta` habria quince dialogos en una
 * rejilla de quince tarjetas —quince copias del mismo formulario esperando a no
 * usarse nunca— y el estado de "esta abierto" se repetiria quince veces para
 * que solo uno pudiera ser cierto.
 *
 * No necesita saber que inmueble se iba a marcar: de eso se encarga el almacen
 * en cuanto aparece la sesion.
 */
export function PuertaMeGusta() {
  const abierta = usePuertaMeGusta()
  if (!abierta) return null

  return (
    <Suspense fallback={null}>
      <AccountDialog
        open
        motivo="account.dialog.subtitle.likes"
        onOpenChange={(open) => {
          if (!open) cerrarPuertaMeGusta()
        }}
      />
    </Suspense>
  )
}
