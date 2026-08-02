import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/site'

export function NotFound() {
  return (
    <div className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <p className="tabular text-5xl font-light">404</p>
      <h1 className="text-2xl font-semibold">Esta página no existe</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Puede que el enlace esté mal escrito o que el contenido se haya movido.
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
