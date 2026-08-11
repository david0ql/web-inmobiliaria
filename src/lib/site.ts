/**
 * Los datos de la empresa. Estaban repartidos por el tema de WASI (cabecera,
 * pie, ficha, modal de ofertar); aqui viven en un solo sitio porque cambian a la
 * vez y son los mismos en las cinco pantallas.
 */

export const SITE = {
  name: 'Serrano Inmobiliaria',
  /**
   * El lema y la descripcion son texto visible, y esto es una constante de
   * modulo: guardan la CLAVE y se traducen donde se pintan, con `t`.
   */
  tagline: 'site.tagline',
  /**
   * La descripcion que ve alguien en el resultado de Google. Dice donde
   * operamos y que vendemos, porque "lideres en Colombia" no responde a
   * ninguna busqueda real: quien busca escribe "apartamentos en venta en
   * Bucaramanga".
   */
  description: 'site.description',
  phone: '+573222023280',
  phoneHref: 'tel:+573222023280',
  email: 'contacto@serrano-inmobiliaria.com',
  address: 'Carrera 29 #45-45',
  city: 'Bucaramanga - Santander - Colombia',
  logo: '/logo.png',
  url: 'https://web-clientes-inmobiliaria.nordikhat.com',
  /** Los municipios del area metropolitana donde hay inventario. */
  areaServed: [
    'Bucaramanga',
    'Floridablanca',
    'Girón',
    'Piedecuesta',
    'Lebrija',
    'Los Santos',
  ],
  social: [
    'https://www.facebook.com/profile.php?id=61565195281888',
    'https://www.instagram.com/serrano_inmobiliaria/',
    'https://www.youtube.com/@SerranoInmobiliaria',
    'https://www.tiktok.com/@serrano_inmobiliaria',
  ],
} as const

export const SOCIAL = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61565195281888',
  },
  { name: 'Instagram', href: 'https://www.instagram.com/serrano_inmobiliaria/' },
  { name: 'YouTube', href: 'https://www.youtube.com/@SerranoInmobiliaria' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@serrano_inmobiliaria' },
] as const

/**
 * Las rutas, en un solo sitio. Todo enlace interno sale de aqui: cambiar un
 * valor mueve el sitio entero, el sitemap incluido.
 *
 * Heredamos las del tema de WASI —`/s`, `/s/ventas`, `/main-contactenos.htm`,
 * `/main-contenido-cat-6.htm`— y estaban indexadas, asi que no se pueden
 * romper: siguen vivas como `301` hacia estas, configurados en el nginx del
 * servidor. El posicionamiento se traspasa; la URL fea no se hereda.
 *
 * Los nombres de los parametros de busqueda SI son los de WASI todavia
 * (`id_property_type`, `business_type[0]`...): van en la query, no en el path,
 * y los llevan enlaces publicados en portales. Ver `search-params.ts`.
 */
export const ROUTES = {
  home: '/',
  search: '/buscar',
  sales: '/venta',
  projects: '/proyectos',
  account: '/mi-cuenta',
  // Creditos no esta aqui: no es una pagina, es el modal de consulta de
  // viabilidad que abre `CreditButton` desde el menu.
  contact: '/contacto',
  privacy: '/privacidad',
} as const

/**
 * El panel interno es otra aplicacion —la carpeta `web/`— y vive en su propio
 * dominio, asi que "Iniciar sesion" sale del sitio publico. `/acceso` es la ruta
 * de entrada que declara su router.
 */
export const PANEL_URL = 'https://web-inmobiliaria.nordikhat.com/acceso'

/** El centro del mapa de la home: el area metropolitana de Bucaramanga. */
export const MAP_CENTER: [number, number] = [7.1193, -73.1227]
export const MAP_ZOOM = 12
