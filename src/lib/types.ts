/**
 * Los tipos del modulo `public` de la API. Solo lo que el sitio pinta: el
 * payload trae mas campos (wasiId, labelId, visits, assignedAgentId...) que aqui
 * no interesan y que no se declaran para que no acaben en pantalla por descuido.
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
  /** Texto libre heredado de WASI; esta vacio en todo el inventario. */
  unitType: string | null
  /** La tipologia a la que pertenece, ya como fila de `unit_type`. */
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
