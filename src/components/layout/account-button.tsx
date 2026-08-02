import { LogIn, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/site'
import { usePortalClient } from '@/lib/use-portal'

/**
 * La entrada al portal del propietario.
 *
 * Cambia de rótulo según haya sesión o no: "Entrar" es una invitación, "Mi
 * cuenta" es un sitio al que volver. Con el mismo botón para los dos casos,
 * quien ya entró no sabe si sigue dentro.
 *
 * No espera a que la sesión se recupere: mientras tanto enseña "Entrar", que es
 * lo correcto para la mayoría de visitantes y no hace parpadear la cabecera.
 */
export function AccountButton({
  className,
  size,
}: {
  className?: string
  size?: React.ComponentProps<typeof Button>['size']
}) {
  const client = usePortalClient()

  return (
    <Button asChild variant="outline" size={size} className={className}>
      <Link to={ROUTES.account}>
        {client ? <UserRound /> : <LogIn />}
        {client ? 'Mi cuenta' : 'Entrar'}
      </Link>
    </Button>
  )
}
