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

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
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

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1)
console.log(`home.html ${kb(html)} kB · index.html ${kb(resto)} kB`)
