import { AlertTriangle } from 'lucide-react'
import { Navigate, useRouteError } from 'react-router-dom'
import { Link } from '@/lib/nav'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { mensajeDeError } from '@/lib/api-error'
import { useIdioma, useT } from '@/lib/i18n'
import { ROUTES } from '@/lib/site'

/**
 * El `errorElement` de las rutas.
 *
 * Un 404 de la API no es un fallo del sitio: es un inmueble que ya se vendio o
 * que se retiro. Como cualquier otra URL que no lleva a ninguna parte, se
 * devuelve al visitante a la portada.
 *
 * La distincion importa: se redirige SOLO cuando la API dice que no existe.
 * Si lo que ha pasado es que la API esta caida o ha dado un 500, mandar a la
 * portada seria enseñar un sitio aparentemente sano mientras esta roto, y
 * nadie se enteraria — ni el visitante, que creeria que se equivoco de enlace,
 * ni nosotros.
 */
export function ErrorState() {
  const t = useT()
  const { idioma } = useIdioma()
  const error = useRouteError()
  const notFound = error instanceof ApiError && error.status === 404

  if (notFound) return <Navigate to={ROUTES.home} replace />

  return (
    <div className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">
        {notFound ? t('errors.state.gone.title') : t('errors.state.title')}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {notFound
          ? t('errors.state.gone.text')
          : mensajeDeError(error, idioma, t('errors.state.text'))}
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link to={ROUTES.sales}>{t('errors.state.cta.properties')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={ROUTES.home}>{t('errors.state.cta.home')}</Link>
        </Button>
      </div>
    </div>
  )
}
