import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ErrorState } from '@/components/common/error-state'
import { ROUTES } from '@/lib/site'
import { Root } from '@/routes/root'
import {
  homeLoader,
  projectLoader,
  projectsLoader,
  propertyLoader,
  rootLoader,
  salesLoader,
  searchLoader,
} from '@/routes/loaders'

/**
 * Las rutas nuevas, en castellano y sin extension. Las del tema de WASI que
 * esto sustituye —`/s`, `/s/ventas`, `/s/:tipo/ventas`, `/main-contactenos.htm`
 * y `/main-contenido-cat-6.htm`— estaban indexadas y las llevan enlaces
 * publicados en las redes y en los portales, asi que no desaparecen: entran
 * como `301` en el nginx del servidor. No se declaran aqui a proposito. Una
 * redireccion del lado del cliente obliga al navegador a bajarse la aplicacion
 * entera para acabar diciendo "esto esta en otro sitio", y el buscador la lee
 * como blanda: tarda mucho mas en traspasar el posicionamiento.
 *
 * Los paths no se escriben a mano en ningun otro fichero — salen de `ROUTES`.
 *
 * Fijate en el reparto: el `loader` va SIEMPRE importado de forma normal y solo
 * el componente entra por `lazy`. Puestos juntos dentro del modulo diferido, el
 * router tendria que bajarse la pantalla entera antes de poder pedir el primer
 * dato — una vuelta de red encadenada a otra. Asi la peticion sale a la vez que
 * la descarga del componente.
 */
const errorElement = <ErrorState />

const PANTALLAS = [
      {
        index: true,
        loader: homeLoader,
        errorElement,
        lazy: async () => ({ Component: (await import('@/routes/home')).Home }),
      },
      // Busqueda libre y listados de venta. Los tres apuntan a la misma
      // pantalla: lo que cambia es de donde salen los filtros iniciales, y eso
      // lo decide el loader, no el path.
      ...[
        { path: 'buscar', loader: searchLoader },
        { path: 'venta', loader: salesLoader },
        { path: 'venta/:typeSlug', loader: salesLoader },
      ].map(({ path, loader }) => ({
        path,
        loader,
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
        path: 'mi-cuenta',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/account')).Account,
        }),
      },
      // Creditos no tiene ruta: es un modal que se abre desde el menu. Ver
      // `CreditButton`.
      {
        path: 'contacto',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/contact')).Contact,
        }),
      },
      {
        path: 'privacidad',
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/privacy')).Privacy,
        }),
      },
      // La ficha. El primer segmento es decorativo; el que manda es `code`.
      // Va la ultima porque es la mas golosa: cualquier par de segmentos
      // encaja, `/venta/apartamento` incluido. No se la come porque el router
      // puntua por especificidad y no por orden —un segmento literal gana
      // siempre a uno dinamico—, pero declararla al final deja escrita la
      // precedencia que queremos por si alguna vez se lee al reves.
      {
        path: ':slug/:code',
        loader: propertyLoader,
        errorElement,
        lazy: async () => ({
          Component: (await import('@/routes/property')).PropertyDetail,
        }),
      },
      /*
        Cualquier cosa que no encaje arriba se va a la portada.

        Aviso de lo que cuesta: para un buscador esto es un "soft 404" —pide
        una URL que no existe y recibe un 200 con la portada— y lo trata peor
        que un 404 honesto, porque no puede distinguir "esto ya no esta" de
        "esto es la home". Por eso las URLs viejas de WASI NO caen aqui: van
        con un 301 de nginx a su equivalente exacto, que si traspasa el
        posicionamiento.

        Lo que queda para este comodin son enlaces mal escritos y rastreadores
        probando suerte, y ahi devolver al visitante a la portada es mejor que
        dejarle en una pagina sin salida.
      */
      {
        path: '*',
        element: <Navigate to={ROUTES.home} replace />,
      },
]

/*
  Las dos ramas del sitio: el español en la raiz y el ingles bajo `/en`.

  El idioma va en la URL y no solo en el navegador porque si no, para un
  buscador la version inglesa no existe: hay una sola direccion que a veces
  responde en un idioma y a veces en otro, y eso no se puede indexar, ni
  enlazar, ni compartir. Con dos rutas hay dos paginas que se declaran
  hermanas con `hreflang` y cada una posiciona en su idioma.

  El español se queda en la raiz —es el mercado principal y son las URLs que
  ya estan indexadas— y el ingles cuelga de un prefijo, que es lo que hace todo
  el mundo y lo que Google documenta.
*/
const RAMA = {
  element: <Root />,
  loader: rootLoader,
  errorElement,
  children: PANTALLAS,
}

export const router = createBrowserRouter([
  { id: 'root', path: '/', ...RAMA },
  { id: 'root-en', path: '/en', ...RAMA },
])
