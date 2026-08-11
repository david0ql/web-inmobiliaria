import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'

import { useIdioma } from '@/lib/i18n'

/**
 * Enlaces que no se salen del idioma.
 *
 * Con el idioma en la URL, un `<Link to="/venta">` desde `/en/proyectos` te
 * devolvia al español sin avisar. Pasa en cada enlace del sitio, así que en
 * lugar de escribir el prefijo trescientas veces, se envuelve el enlace: los
 * destinos siguen escritos como siempre —`ROUTES.sales`— y el prefijo lo pone
 * esto.
 *
 * Las direcciones externas y las anclas se dejan intactas: prefijar
 * `https://wa.me/...` seria romperlo.
 */
export function useRuta(): (to: string) => string {
  const { idioma } = useIdioma()
  return (to) => prefijo(to, idioma === 'en')
}

export function Link({ to, ...props }: LinkProps) {
  const ruta = useRuta()
  return <RouterLink to={typeof to === 'string' ? ruta(to) : to} {...props} />
}

export function NavLink({ to, ...props }: NavLinkProps) {
  const ruta = useRuta()
  return <RouterNavLink to={typeof to === 'string' ? ruta(to) : to} {...props} />
}

/** `navigate()` con el mismo cuidado que `<Link>`. */
export function useNavigate() {
  const navigate = useRouterNavigate()
  const ruta = useRuta()
  return (to: string | number, options?: { replace?: boolean }) =>
    typeof to === 'number'
      ? navigate(to)
      : navigate(ruta(to), options)
}

function prefijo(to: string, ingles: boolean): string {
  if (!ingles) return to
  if (!to.startsWith('/')) return to
  if (to.startsWith('/en/') || to === '/en') return to
  return to === '/' ? '/en' : `/en${to}`
}
