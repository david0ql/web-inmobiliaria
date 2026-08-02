import { AlertTriangle } from 'lucide-react'
import { Link, useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { ROUTES } from '@/lib/site'

/**
 * El `errorElement` de las rutas. Un 404 de la API no es un fallo del sitio: es
 * un inmueble que ya se vendio o que se retiro, y se cuenta como tal.
 */
export function ErrorState() {
  const error = useRouteError()
  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">
        {notFound ? 'Ese inmueble ya no está publicado' : 'Algo se ha roto'}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {notFound
          ? 'Puede que se haya vendido o que lo hayamos retirado. Echa un vistazo al resto del inventario.'
          : error instanceof ApiError
            ? error.message
            : 'No hemos podido cargar la información. Revisa tu conexión e inténtalo otra vez.'}
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link to={ROUTES.sales}>Ver inmuebles</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={ROUTES.home}>Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
