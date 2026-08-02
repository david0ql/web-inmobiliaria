# web-sell — sitio público

El escaparate de la agencia, reconstruido en React sobre la API propia. Sustituye
al tema alquilado de WASI que sigue en `serrano-inmobiliaria.com`: mismas
secciones, mismas rutas, mismo comportamiento responsive, pero con el inventario
y las fotos que ya viven en `api/`.

```bash
cp .env.example .env      # solo si la API no esta en localhost:3000
yarn install
yarn dev                  # http://localhost:5174
```

Necesita la API levantada (`cd ../api && yarn start:dev`), incluida la ruta
`/media`: las fotos no salen de un CDN, las sirve el propio backend desde
`uploads/`. El proxy de `vite.config.ts` cubre las dos.

## Rutas

Salen todas de `ROUTES` en `src/lib/site.ts`; ningun componente escribe un path
a mano.

| Ruta | Pantalla |
|---|---|
| `/` | Mapa, busqueda avanzada, destacados y ultimos inmuebles |
| `/buscar` | Busqueda libre (`?match=`) |
| `/venta` | Todo el inventario en venta |
| `/venta/:tipo` | Por tipo (`?id_property_type=2&business_type[0]=for_sale`) |
| `/:titulo/:code` | Ficha del inmueble |
| `/contacto` | Contactenos |
| `/privacidad` | Politicas de privacidad |

### Las URLs viejas

El tema de WASI publicaba `/s`, `/s/ventas`, `/s/:tipo/ventas`,
`/main-contactenos.htm` y `/main-contenido-cat-6.htm`. Estan indexadas y las
llevan enlaces del menu, de las redes y de los portales, asi que **siguen
respondiendo**: entran como `301` hacia las nuevas en la configuracion de nginx
del servidor, que no vive en este repositorio. Si al desplegar una URL vieja da
404, es ahi donde hay que mirar — no en el router.

No se declaran en el router ni en el sitemap a proposito. Una redireccion en el
cliente obliga a bajarse la aplicacion entera para acabar navegando a otro sitio,
y el buscador la trata como blanda: tarda mucho mas en traspasar el
posicionamiento acumulado.

Los **nombres de los parametros** de busqueda si siguen siendo los de WASI
(`id_property_type`, `business_type[0]`, `min_price`, `orden`, `pagina`): van en
la query, no en el path, y los llevan enlaces ya publicados. Ver
`src/lib/search-params.ts`.

El primer segmento de la ficha es decorativo: la API busca por `code`, no hay
slug en la tabla de inmuebles. Se calcula en cliente con la misma normalizacion
que usa `slugify()` en la API, para que los slugs no diverjan.

Los filtros viven **solo** en la URL (`useSearchParams`), asi que una busqueda se
puede compartir, recargar y recorrer con el boton atras.

## Como se corresponde con la API

| Pantalla | Endpoint |
|---|---|
| Destacados | `GET /public/properties?limit=9` — el orden por defecto ya pone los `OUTSTANDING` primero |
| Ultimos | `GET /public/properties?sort=recent&limit=9` |
| Resultados | `GET /public/properties` + filtros |
| Ficha | `GET /public/properties/:code` — incluye el asesor a cargo |
| Otras unidades | `GET /public/properties/:code/siblings` |
| Selects | `GET /public/catalogs` y `GET /public/catalogs/zones?cityId=` |
| Contadores del menu | `GET /public/catalogs/counts` |
| Agendar visita | `GET .../availability` + `POST /public/visits` |
| Modal OFERTAR | `POST /public/consignments` |

Tres cosas del dominio que no son obvias y que condicionan el codigo:

- **Destacado no es un booleano**: es `publicationStatus === 'OUTSTANDING'`.
- **Venta/arriendo no es un enum**: son cuatro booleanos que pueden darse a la vez.
- **La descripcion esta en `observations`**; no hay campo `description`.

Y una del transporte: el `ValidationPipe` de la API va con
`forbidNonWhitelisted`, asi que mandar un parametro que el DTO no declara
devuelve un 400. Por eso `toApiQuery()` en `lib/search-params.ts` es una lista
blanca explicita y no un volcado del objeto de filtros.

## Lo que se toco en `api/` para esto

El buscador del sitio anterior tenia filtros que el modulo publico no soportaba,
asi que se añadieron:

- `bathrooms`, `condition` y `forTransfer` en `SearchPublicPropertiesDto` y en
  `PublicService.searchProperties`.
- `GET /public/catalogs/zones?cityId=` — para que **Zona / barrio** sea un
  desplegable de verdad y no un campo de texto. Se pide por ciudad: en toda
  Colombia son varios miles.
- `GET /public/catalogs/counts` — los numeros del menu, en una consulta agrupada
  en vez de doce consultas de un resultado.
- El **asesor a cargo** en la ficha, recortado a mano en `PublicService.publicAgent`
  a nombre, correo, movil, WhatsApp y foto. No se resuelve con `leftJoinAndSelect`
  a proposito: la relacion traeria rol, estado y ultimo acceso a una respuesta sin
  token. Si el asesor ya no esta activo, la API manda `null` y la ficha cae en el
  contacto de la agencia.

Queda una carencia conocida, que hoy no estorba porque el sitio es solo de venta:
`minPrice`/`maxPrice` filtran unicamente `sale_price`, asi que un apartado de
arriendos no podria filtrar por canon.

## Decisiones

- **Breakpoints de Bootstrap, no de Tailwind.** El tema original esta maquetado
  contra 576/768/992/1200, y el encargo era que el responsive se comportara
  igual, asi que el tema de Tailwind se sobreescribe en `index.css`.
- **Leaflet a pelo**, sin react-leaflet: el unico estado son los marcadores y el
  cluster es un plugin imperativo.
- **Los iconos de marca van dibujados a mano** en `social-links.tsx`. lucide dejo
  de publicarlos y el tema anterior usaba Font Awesome Pro, que es de pago.
- **Sin modo oscuro.** El sitio publico es claro, como el actual.

## Comandos

```bash
yarn dev      yarn build      yarn lint      yarn preview
```
