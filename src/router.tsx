import { createBrowserRouter } from 'react-router-dom'

import { ErrorState } from '@/components/common/error-state'
import { Root } from '@/routes/root'
import {
  homeLoader,
  projectLoader,
  projectsLoader,
  propertyLoader,
  rootLoader,
  searchLoader,
} from '@/routes/loaders'

/**
 * Las rutas son las mismas que las del sitio que esto sustituye, `.htm`
 * incluidos. No es nostalgia: son las URLs indexadas y las que llevan los
 * enlaces publicados en el menu, en las redes y en los portales. Estrenar unas
 * mas limpias costaria el posicionamiento acumulado.
 *
 * Fijate en el reparto: el `loader` va SIEMPRE importado de forma normal y solo
 * el componente entra por `lazy`. Puestos juntos dentro del modulo diferido, el
 * router tendria que bajarse la pantalla entera antes de poder pedir el primer
 * dato — una vuelta de red encadenada a otra. Asi la peticion sale a la vez que
 * la descarga del componente.
 */
const errorElement = <ErrorState />

export const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    element: <Root />,
    loader: rootLoader,
    errorElement,
    children: [
      {
        index: true,
        loader: homeLoader,
        errorElement,
        lazy: async () => ({ Component: (await import('@/routes/home')).Home }),
      },
      // Busqueda libre y listados de venta. Los tres apuntan a la misma
      // pantalla: lo que cambia es de donde salen los filtros iniciales.
      ...['s', 's/ventas', 's/:typeSlug/ventas'].map((path) => ({
        path,
        loader: searchLoader,
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/search')).SearchResults,
        }),
      })),
      {
        path: 'proyectos',
        loader: projectsLoader,
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/projects')).ProjectsList,
        }),
      },
      {
        path: 'proyectos/:slug',
        loader: projectLoader,
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/project')).ProjectPage,
        }),
      },
      {
        path: 'creditos',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/credits')).Credits,
        }),
      },
      {
        path: 'main-contactenos.htm',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/contact')).Contact,
        }),
      },
      {
        path: 'main-contenido-cat-6.htm',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/privacy')).Privacy,
        }),
      },
      // La ficha. El primer segmento es decorativo; el que manda es `code`.
      // Va la ultima porque es la mas golosa: cualquier par de segmentos encaja.
      {
        path: ':slug/:code',
        loader: propertyLoader,
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/property')).PropertyDetail,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('@/routes/not-found')).NotFound,
        }),
      },
    ],
  },
])
