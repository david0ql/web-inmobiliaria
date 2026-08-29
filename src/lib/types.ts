/**
 * Los tipos del modulo `public` de la API. Solo lo que el sitio pinta.
 *
 * Durante un tiempo esto fue la unica defensa: las rutas publicas devolvian las
 * entidades enteras —`wasiId`, `labelId`, `visits`, `assignedAgentId`, y de las
 * fotos hasta `storageKey`, la ruta interna en el servidor— y no declararlas
 * era lo que evitaba que acabaran en pantalla por descuido. Ya no: la API
 * recorta en origen lo que sale por cada ruta publica.
 *
 * Se sigue declarando solo lo que se usa, pero ahora por otra razon: que el
 * tipo diga que necesita el sitio de verdad. Si un campo desaparece del
 * payload, aqui se ve a que pantalla afecta.
 */

export interface Paginated<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
    hasNext: boolean
  }
}

export interface Named {
  id: number
  name: string
}

export interface City extends Named {
  regionId: number
  region?: Region | null
  /*
    `countryId` y `count` los pone el catalogo publico, que arma la geografia
    desde el inventario: solo salen los sitios donde hay algo publicado, con
    cuantos hay. Ver `geography()` en la API.
  */
  countryId?: number
  count?: number
}

export interface Region extends Named {
  countryId: number
  count?: number
}

export interface Country extends Named {
  count?: number
}

export interface Zone extends Named {
  cityId: number
}

export interface PropertyType extends Named {
  active: boolean
}

export type FeatureScope = 'INTERNAL' | 'EXTERNAL'

export interface Feature extends Named {
  scope: FeatureScope
}

export interface Currency {
  id: number
  iso: string
  name: string
}

export interface PropertyImage {
  id: string
  /** Miniatura, 560px. Rutas relativas servidas desde /media. */
  url: string
  /** 1600px. */
  urlMedium: string | null
  urlLarge: string
  /** Archivo, 2560px. */
  urlOriginal: string
  description: string | null
  position: number
  isMain: boolean
  width: number | null
  height: number | null
}

export type Availability =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'SOLD'
  | 'RENTED'
  | 'WITHDRAWN'

/** `OUTSTANDING` es el "destacado" del sitio: no hay un booleano `featured`. */
export type PublicationStatus = 'DRAFT' | 'ACTIVE' | 'OUTSTANDING' | 'INACTIVE'

export type Condition = 'NEW' | 'USED' | 'PROJECT' | 'UNDER_CONSTRUCTION'

/** Que puede enseñar el mapa publico de cada inmueble. */
export type MapPublication = 'HIDDEN' | 'APPROXIMATE' | 'EXACT'

export interface PropertyFamily {
  id: string
  name: string
  slug: string
  kind: 'PROJECT' | 'COMPLEX' | 'BUILDING' | 'STAGE'
  status: 'PLANNED' | 'UNDER_CONSTRUCTION' | 'DELIVERED' | 'SOLD_OUT'
  description: string | null
  developer: string | null
}

/**
 * La tipologia de un inmueble, tal como viaja en su ficha.
 *
 * Ya no hay ambiguedad: la API servia la ENTIDAD cruda —areas en
 * `areaMin`/`areaMax` y en texto, porque son `numeric` de Postgres— y ahora
 * sirve el mismo resumen recortado que las filas de `unitTypes`. Las areas se
 * llaman `minArea`/`maxArea`/`builtArea` y son numeros, igual que alli.
 *
 * Aun asi no se declaran, y no por prudencia sino por la regla de la cabecera
 * de este fichero: el sitio no las necesita de aqui —el rango de la tipologia
 * se lee de la ficha del proyecto, que es donde se compara—. Añadirlas ahora
 * es seguro; añadirlas sin usarlas solo hace que el tipo deje de decir que
 * necesita el sitio.
 */
export interface PropertyUnitType {
  id: string
  /** Corto y unico dentro del proyecto: "A", "B", y "L1" en suelo. */
  code: string | null
  /** Compuesto y en español; el sitio lo rearma, no lo pinta. */
  name: string | null
  kind: 'FIXED' | 'AUTO' | null
  /** Nulos en suelo, en las dos versiones: un lote no tiene ninguna de las tres. */
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
}

export interface Property {
  /** UUID interno. Solo lo pide POST /public/visits; las URLs usan `code`. */
  id: string
  /** El identificador publico, el que sale en la ficha: "9009194". */
  code: string
  title: string
  address: string | null

  forSale: boolean
  forRent: boolean
  forTransfer: boolean
  forTemporaryRent: boolean

  salePrice: number | null
  rentPrice: number | null
  maintenanceFee: number | null
  rentPeriod: string | null
  currency: Currency | null

  propertyType: PropertyType | null
  /** El barrio. La ciudad es `city` y el departamento `city.region`. */
  zone: Zone | null
  city: City | null

  latitude: number | null
  longitude: number | null
  mapPublication: MapPublication

  area: number | null
  builtArea: number | null
  privateArea: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  floor: number | null
  stratum: number | null
  condition: Condition | null
  buildingYear: number | null

  availability: Availability
  publicationStatus: PublicationStatus

  /** No hay campo `description`: la descripcion vive en observaciones. */
  observations: string | null
  /** Lo mismo en ingles, escrito a mano desde el panel. */
  observationsEn?: string | null
  videoUrl: string | null
  /** Recorrido 360 (Kuula). */
  tourUrl: string | null

  family: PropertyFamily | null
  /**
   * La tipologia a la que pertenece.
   *
   * Viaja de dos maneras segun la version de la API: como el texto libre que
   * heredamos de WASI —vacio en todo el inventario— y, desde que existe la
   * tabla `unit_type`, como la fila entera. Se admiten las dos porque no se
   * despliegan a la vez, y porque pintar la union sin comprobarla dejaba un
   * "[object Object]" al lado del nombre del proyecto.
   */
  unitType: string | PropertyUnitType | null
  unitTypeId?: string | null

  /** En el listado viene solo la portada; en la ficha, todas. */
  images: PropertyImage[]
  /** Solo en la ficha. */
  features?: Feature[]
  /** Solo en la ficha, y nulo si el asesor ya no esta activo. */
  agent?: PublicAgent | null

  createdAt: string
}

/**
 * Donde hay algo publicado, y cuanto.
 *
 * Va aparte de `cities` a proposito: esto alimenta el buscador —de nada sirve
 * ofrecer una ciudad sin inmuebles— mientras que `cities` sigue siendo el
 * catalogo entero, que necesita quien va a consignar en una ciudad donde
 * todavia no tenemos nada.
 */
export interface Geography {
  countries: Country[]
  regions: Region[]
  cities: City[]
}

export interface Catalogs {
  geo: Geography
  cities: City[]
  propertyTypes: PropertyType[]
  features: Feature[]
}

export interface TypeCount {
  propertyTypeId: number
  total: number
  forSale: number
}

/**
 * El asesor a cargo, recortado por la API a lo que un visitante necesita para
 * llamar. Solo viaja en la ficha, nunca en el listado.
 */
export interface PublicAgent {
  fullName: string
  email: string
  cellPhone: string | null
  hasWhatsapp: boolean
  photoUrl: string | null
}

export interface BookVisitPayload {
  propertyId: string
  startsAt: string
  firstName: string
  lastName?: string
  phone: string
  email?: string
  message?: string
}

export interface BookVisitResult {
  appointmentId: string
  startsAt: string
  endsAt: string
  propertyCode: string
  message: string
}

export interface ConsignmentResult {
  reference: string
  message: string
  files: number
}

export interface CreditRequestResult {
  reference: string
  message: string
}
