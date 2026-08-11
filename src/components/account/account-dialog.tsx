import { AccountGate } from '@/components/account/account-gate'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useT } from '@/lib/i18n'

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
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('account.dialog.title')}</DialogTitle>
          <DialogDescription>{t('account.dialog.subtitle')}</DialogDescription>
        </DialogHeader>

        <AccountGate compact />
      </DialogContent>
    </Dialog>
  )
}
