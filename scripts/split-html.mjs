import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/*
  El armazon que se sirve con el HTML lleva la foto del mapa, que es el elemento
  mas grande de la portada. Pero index.html es tambien el que responde a
  cualquier otra ruta del sitio: en una ficha de inmueble esa foto eran 35 kB
  descargados con prioridad alta compitiendo contra la foto del inmueble, que es
  la que de verdad marca el LCP alli.

  Asi que se parte en dos. Mismo bundle, mismos assets, misma aplicacion: lo
  unico que cambia es que index.html no lleva el trozo del mapa. nginx sirve
  home.html en "/" y index.html en todo lo demas.
*/
const DIST = new URL('../dist/', import.meta.url).pathname
const MARCA_INI = '<!--home-->'
const MARCA_FIN = '<!--/home-->'

const html = enLinea(readFileSync(join(DIST, 'index.html'), 'utf8'))
const ini = html.indexOf(MARCA_INI)
const fin = html.indexOf(MARCA_FIN)

if (ini === -1 || fin === -1) {
  console.error('split-html: faltan las marcas <!--home--> en index.html')
  process.exit(1)
}

// La portada se queda con todo, sin las marcas.
writeFileSync(
  join(DIST, 'home.html'),
  html.replaceAll(MARCA_INI, '').replaceAll(MARCA_FIN, ''),
)

// El resto pierde los bloques marcados. Se recorre de atras hacia delante para
// que los indices sigan siendo validos al ir cortando.
let resto = html
for (;;) {
  const a = resto.lastIndexOf(MARCA_INI)
  if (a === -1) break
  const b = resto.indexOf(MARCA_FIN, a)
  resto = resto.slice(0, a) + resto.slice(b + MARCA_FIN.length)
}
writeFileSync(join(DIST, 'index.html'), resto)

/*
  La hoja de estilos, dentro del HTML.

  Bloquea el pintado: hasta que llega, no se ve nada. Y como es un fichero
  aparte, el navegador tiene que descubrirla leyendo el HTML y pedirla en otra
  vuelta de red — en movil, unos 150 ms de nada antes de poder empezar. Dentro
  llega con el documento.

  No se pierde cache: el HTML se sirve con `no-cache`, que significa
  "revalida", asi que en la segunda visita el navegador recibe un 304 y reusa
  el que ya tiene, con los estilos dentro.
*/
function enLinea(html) {
  const link = html.match(
    /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,
  )
  if (!link) {
    console.error('split-html: no se encontro la hoja de estilos')
    process.exit(1)
  }

  const css = readFileSync(join(DIST, link[1].replace(/^\//, '')), 'utf8')
  return html.replace(link[0], `<style>${css}</style>`)
}

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1)
console.log(`home.html ${kb(html)} kB · index.html ${kb(resto)} kB`)
