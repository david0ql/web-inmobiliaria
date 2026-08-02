import { AccountGate } from '@/components/account/account-gate'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Entrar o crear cuenta sin salir de donde estabas.
 *
 * Es el mismo formulario de `/account`, en un diálogo. Se usa cuando alguien
 * pulsa algo que exige sesión —publicar un inmueble— para no mandarlo a otra
 * página y hacerle volver a buscar el botón.
 *
 * No lleva callback de "ya entró": el estado de la sesión vive fuera de React
 * y quien abre esto lo está mirando igualmente, así que se entera solo.
 */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entra a tu cuenta</DialogTitle>
          <DialogDescription>
            Para publicar un inmueble necesitamos saber quién eres: es la cuenta
            desde la que después sigues sus visitas.
          </DialogDescription>
        </DialogHeader>

        <AccountGate compact />
      </DialogContent>
    </Dialog>
  )
}
