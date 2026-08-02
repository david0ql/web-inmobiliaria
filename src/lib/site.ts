/**
 * Los datos de la empresa. Estaban repartidos por el tema de WASI (cabecera,
 * pie, ficha, modal de ofertar); aqui viven en un solo sitio porque cambian a la
 * vez y son los mismos en las cinco pantallas.
 */

export const SITE = {
  name: 'Serrano Inmobiliaria',
  tagline: 'Lideres en compra y venta de inmuebles en Colombia',
  phone: '+573222023280',
  phoneHref: 'tel:+573222023280',
  email: 'contacto@serrano-inmobiliaria.com',
  address: 'Carrera 29 #45-45',
  city: 'Bucaramanga - Santander - Colombia',
  logo: '/logo.png',
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
 * Las rutas del sitio anterior se conservan tal cual, incluidos los `.htm`: son
 * las que estan indexadas y las que llevan los enlaces de las redes y de los
 * portales. Cambiarlas por unas mas bonitas costaria posicionamiento.
 */
export const ROUTES = {
  home: '/',
  search: '/s',
  sales: '/s/ventas',
  projects: '/proyectos',
  contact: '/main-contactenos.htm',
  privacy: '/main-contenido-cat-6.htm',
} as const

/** El centro del mapa de la home: el area metropolitana de Bucaramanga. */
export const MAP_CENTER: [number, number] = [7.1193, -73.1227]
export const MAP_ZOOM = 12
