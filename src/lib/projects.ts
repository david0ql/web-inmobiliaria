/**
 * Todo lo de proyectos en un solo modulo: tipos, traduccion URL <-> API y las
 * dos llamadas que necesita la seccion.
 *
 * Un proyecto es una `PropertyFamily` de la API — el conjunto, la torre o la
 * obra nueva a la que pertenecen varios inmuebles. No es un inmueble: no tiene
 * codigo, ni precio propio, ni ficha de venta. Lo que se vende son sus
 * unidades, y esas si son inmuebles con su ficha (ver `propertyPath`).
 */

import type { Query } from './api'
import { api } from './api'
import type {
  City,
  Paginated,
  Property,
  PropertyImage,
  Zone,
} from './types'

export type FamilyKind = 'PROJECT' | 'COMPLEX' | 'BUILDING' | 'STAGE'

export type FamilyStatus =
  | 'PLANNED'
  | 'UNDER_CONSTRUCTION'
  | 'DELIVERED'
  | 'SOLD_OUT'

export interface ProjectFamily {
  id: string
  name: string
  slug: string
  kind: FamilyKind
  status: FamilyStatus
  description: string | null
  developer: string | null
  city: City | null
  zone: Zone | null
  address: string | null
  /* La API los sirve como `numeric`, y `numeric` en Postgres viaja en texto. */
  latitude: string | null
  longitude: string | null
  deliveryYear: number | null
  totalUnits: number | null
  coverUrl: string | null
  /* Opcional a proposito: hoy el listado solo trae `coverUrl`, y la tarjeta
     monta el carrusel solo si algun dia llegan las fotos. */
  images?: PropertyImage[]
  children?: ProjectFamily[]
}

/** Lo que trae cada fila del listado: la familia mas el resumen de su oferta. */
export interface ProjectSummary extends ProjectFamily {
  unitTypeCount: number
  availableUnits: number
  fromPrice: number | null
}

/**
 * Quien decide la tipologia.
 *
 * `FIXED` la escribe la agencia —"Tipo A, 2 alcobas, 58 m2"— y manda ella.
 * `AUTO` la pone la API por tramo de area, y es para suelo: en un loteo no hay
 * dos lotes iguales, no hay alcobas por las que agrupar y escribir una
 * tipologia por lote seria una por inmueble.
 */
export type UnitTypeKind = 'FIXED' | 'AUTO'

/**
 * Una tipologia del proyecto: el "Tipo A" del que hay veinte iguales. Es como
 * se compra obra nueva — nadie compara veinte apartamentos casi iguales,
 * compara "Tipo A · 3 alcobas · 73 – 75 m²".
 *
 * Los campos opcionales son los que solo existen desde que la API sirve la
 * tabla `unit_type`; hasta entonces las tipologias se calculaban agrupando por
 * `property.unit_type`, un texto libre que esta vacio en todo el inventario, y
 * de ahi salia el "Sin clasificar" que se veia en la ficha. Ver
 * `normalizarTipologia()` para el porque de aceptar las dos formas.
 */
export interface UnitTypeSummary {
  /** Solo con la tabla: es lo que ata cada unidad a su tipologia. */
  id: string | null
  /** Corto y unico dentro del proyecto: "A", "B", y "L1" en suelo. */
  code: string | null
  /**
   * El rotulo ya compuesto que guarda la base: "Tipo A · 3 alcobas · 73 – 75
   * m²". Viene SIEMPRE en español, asi que el sitio no lo pinta: se rearma en
   * el cliente con `code`, `bedrooms` y el rango, que es lo unico que se puede
   * traducir. Se conserva como ultimo recurso, para una tipologia tan vacia que
   * no haya con que componer nada.
   */
  name: string | null
  /**
   * Lo que la agencia escribio SOBRE esta tipologia, para que se lea: "esquinero,
   * con vista al parque". No se compone ni se deduce de nada, asi que si esta,
   * se pinta tal cual — es lo unico de la tipologia que dice algo que los
   * numeros no pueden decir.
   */
  description: string | null
  kind: UnitTypeKind
  propertyType: string | null
  units: number
  available: number
  minArea: number | null
  maxArea: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  minPrice: number | null
  maxPrice: number | null
  /**
   * El orden que decide la agencia. No se usa para ordenar: la API ya sirve las
   * filas en ese orden y reordenarlas aqui solo abre la puerta a que las dos
   * listas discrepen. Viaja para que se vea que es una decision suya y no del
   * azar de la consulta.
   */
  position: number
}

/** Una tipologia con las unidades concretas que la componen. */
export interface UnitTypeGroup {
  tipologia: UnitTypeSummary
  unidades: Property[]
  /**
   * La tipologia NO existe en el panel: la dedujo el cliente de las propias
   * unidades porque no venia ninguna a la que atarlas. Ver `derivarTipologias()`
   * — es una red contra un dato incompleto, no una segunda fuente de verdad, y
   * por eso una derivada no tiene `code` ni puede tenerlo.
   */
  derivada: boolean
}

export interface ProjectDetail {
  family: ProjectFamily
  unitTypes: UnitTypeSummary[]
  properties: Property[]
  /** Zonas comunes: lo que comparten las unidades del proyecto. */
  amenities: { id: number; name: string }[]
}

// --- etiquetas del dominio -------------------------------------------------
// Guardan la CLAVE, no el texto: son constantes de modulo y `useT()` solo se
// puede llamar dentro de un componente, asi que se traducen al pintarlas.

export const FAMILY_KIND_LABEL: Record<FamilyKind, string> = {
  PROJECT: 'catalog.family_kind.project',
  COMPLEX: 'catalog.family_kind.complex',
  BUILDING: 'catalog.family_kind.building',
  STAGE: 'catalog.family_kind.stage',
}

export const FAMILY_STATUS_LABEL: Record<FamilyStatus, string> = {
  PLANNED: 'catalog.family_status.planned',
  UNDER_CONSTRUCTION: 'catalog.family_status.under_construction',
  DELIVERED: 'catalog.family_status.delivered',
  SOLD_OUT: 'catalog.family_status.sold_out',
}

/**
 * Los colores del tema anterior, oscurecidos hasta que se leen.
 *
 * Los de WASI son los de un panel de administracion, sobre fondo claro y texto
 * oscuro; aqui van con texto blanco encima y ahi no llegaban: el amarillo daba
 * 1,68 de contraste sobre 4,5 que pide la norma —practicamente ilegible— y el
 * verde 2,87.
 *
 * Se conserva el tono para que la etiqueta siga significando lo mismo de un
 * vistazo; solo baja la luminosidad. Son los mismos que las etiquetas de
 * disponibilidad de la ficha, que ya se corrigieron por lo mismo.
 */
export const FAMILY_STATUS_COLOR: Record<FamilyStatus, string> = {
  PLANNED: '#1f5c94',
  UNDER_CONSTRUCTION: '#8a6209',
  DELIVERED: '#2f7d4f',
  SOLD_OUT: '#a81c1c',
}

// --- rutas -----------------------------------------------------------------

export const PROJECTS_PATH = '/proyectos'

export function projectPath(project: { slug: string }): string {
  return `${PROJECTS_PATH}/${encodeURIComponent(project.slug)}`
}

// --- URL <-> API -----------------------------------------------------------

export const PROJECTS_PAGE_SIZE = 12

export interface ProjectFilters {
  match: string
  cityId: string
  page: number
}

/** Nombre en la URL <-> campo de pantalla, como en el buscador de inmuebles. */
const PARAM = {
  match: 'match',
  cityId: 'id_city',
  page: 'pagina',
} as const satisfies Record<keyof ProjectFilters, string>

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  match: '',
  cityId: '',
  page: 1,
}

export function readProjectFilters(params: URLSearchParams): ProjectFilters {
  const page = Number(params.get(PARAM.page))
  return {
    match: params.get(PARAM.match) ?? '',
    cityId: params.get(PARAM.cityId) ?? '',
    page: Number.isFinite(page) && page > 1 ? Math.trunc(page) : 1,
  }
}

export function writeProjectFilters(
  filters: Partial<ProjectFilters>,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, name] of Object.entries(PARAM) as [
    keyof ProjectFilters,
    string,
  ][]) {
    const value = filters[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'page' && Number(value) <= 1) continue
    params.set(name, String(value))
  }
  return params
}

/**
 * De los filtros de pantalla a la consulta de `GET /public/projects`.
 *
 * El `ValidationPipe` de la API va con `forbidNonWhitelisted`: cualquier clave
 * que el DTO no declare devuelve un 400. Por eso esto es una lista blanca a
 * mano y no un volcado del objeto de filtros.
 */
export function toProjectsQuery(
  filters: ProjectFilters,
  limit = PROJECTS_PAGE_SIZE,
): Query {
  return {
    q: filters.match.trim() || undefined,
    cityId: filters.cityId || undefined,
    page: filters.page > 1 ? filters.page : undefined,
    limit,
  }
}

// --- llamadas --------------------------------------------------------------

export async function listProjects(
  query: Query,
  signal?: AbortSignal,
): Promise<Paginated<ProjectSummary>> {
  const payload = await api.get<Paginated<ProjectSummary> | ProjectSummary[]>(
    '/public/projects',
    query,
    signal,
  )
  return asPaginated(
    payload,
    Number(query.page ?? 1),
    Number(query.limit ?? PROJECTS_PAGE_SIZE),
  )
}

/**
 * Los proyectos de la portada.
 *
 * Endpoint propio y no `listProjects`: este rota —otros proyectos en cada
 * visita— sirviendo de un grupo que la API guarda en memoria, asi que cambia
 * sin consultar la base en cada carga.
 */
export function getHomeProjects(signal?: AbortSignal) {
  return api.get<ProjectSummary[]>('/public/home/projects', undefined, signal)
}

export async function getProject(
  slug: string,
  signal?: AbortSignal,
): Promise<ProjectDetail> {
  const payload = await api.get<Omit<ProjectDetail, 'unitTypes'> & {
    unitTypes: RawUnitType[]
  }>(`/public/projects/${encodeURIComponent(slug)}`, undefined, signal)

  return { ...payload, unitTypes: payload.unitTypes.map(normalizarTipologia) }
}

// --- tipologias ------------------------------------------------------------

/**
 * Lo que llega por el cable.
 *
 * Todo opcional porque la API de produccion aun calcula las tipologias al vuelo
 * y no manda `id`, `code`, `name` ni `kind` — los nombres que si comparte con la
 * version de tabla significan lo mismo. Las areas y los precios pueden venir en
 * texto: son `numeric` de Postgres, y `numeric` viaja como cadena.
 *
 * `propertyId` y `coverUrl` llegan y no se leen a proposito: no hacen falta
 * aqui, porque la ficha ya trae las unidades enteras con todas sus fotos, y
 * `propertyId` ademas no sirve para abrir la tipologia (ver `destacada()` en la
 * pagina de proyecto). Hubo tambien un `unitType`, copia de `name` para no
 * romper a quien lo consumiera; se retiro al quitar el andamio y nunca se leyo.
 */
interface RawUnitType {
  id?: string | null
  code?: string | null
  name?: string | null
  description?: string | null
  kind?: UnitTypeKind
  propertyType?: string | null
  units?: number | null
  available?: number | null
  minArea?: number | string | null
  maxArea?: number | string | null
  bedrooms?: number | null
  bathrooms?: number | null
  garages?: number | null
  minPrice?: number | string | null
  maxPrice?: number | string | null
  position?: number | null
}

function normalizarTipologia(raw: RawUnitType): UnitTypeSummary {
  return {
    id: raw.id ?? null,
    code: limpiar(raw.code),
    /*
      Sin `id` no es una tipologia de la agencia: es la bolsa que la API manda
      para lo que nadie ha clasificado, y se llama "Sin clasificar". Ese cartel
      es un aviso para el panel —ahi hay trabajo pendiente— y no algo que
      ofrecerle a quien esta comprando, asi que el nombre se descarta en la
      puerta y el rotulo se compone con lo que la bolsa si sabe de sus unidades.
    */
    name: raw.id ? limpiar(raw.name) : null,
    description: limpiar(raw.description),
    kind: raw.kind === 'AUTO' ? 'AUTO' : 'FIXED',
    propertyType: limpiar(raw.propertyType),
    units: Number(raw.units ?? 0),
    available: Number(raw.available ?? 0),
    minArea: cifra(raw.minArea),
    maxArea: cifra(raw.maxArea),
    bedrooms: entero(raw.bedrooms),
    bathrooms: entero(raw.bathrooms),
    garages: entero(raw.garages),
    minPrice: cifra(raw.minPrice),
    maxPrice: cifra(raw.maxPrice),
    position: Number(raw.position ?? 0),
  }
}

/**
 * Cada tipologia con sus unidades, en el orden en que la API las manda.
 *
 * El vinculo bueno es `property.unitTypeId`, que es una clave ajena de verdad.
 * Mientras no llegue —o para las unidades que la agencia aun no ha asignado— se
 * cae al criterio con el que la API las agrupaba antes: mismo tipo de inmueble
 * y mismas alcobas. No es lo mismo que una tipologia escrita a mano, pero es
 * exactamente el criterio con el que estan contadas las cifras de la tarjeta
 * del listado, asi que la ficha y la tarjeta dicen el mismo numero.
 *
 * Lo que sobre despues de eso NO se tira a un cajon de "Sin clasificar": se
 * convierte en tipologias derivadas de las propias unidades. Un cajon con ese
 * nombre era justo el sintoma del problema viejo, y ademas esconde unidades que
 * estan en venta.
 */
export function agruparPorTipologia(
  unitTypes: UnitTypeSummary[],
  properties: Property[],
): UnitTypeGroup[] {
  const grupos: UnitTypeGroup[] = unitTypes.map((tipologia) => ({
    tipologia,
    unidades: [],
    derivada: false,
  }))

  const porId = new Map(
    grupos.filter((g) => g.tipologia.id).map((g) => [g.tipologia.id, g]),
  )

  /*
    Una sola verdad a la vez.

    En cuanto UNA tipologia trae `id`, la tabla existe y la clave ajena es lo
    unico que ata: una unidad sin `unitTypeId` es una unidad que la agencia no
    ha clasificado, y meterla en el "Tipo A" porque tiene las mismas alcobas es
    inventarse una decision suya. El comprador la veria dentro del Tipo A y el
    panel la seguiria enseñando sin tipologia — la clase de discrepancia que no
    detecta nadie.

    El criterio viejo —mismo tipo de inmueble y mismas alcobas— solo se usa
    mientras NO haya ni una fila con id, que es la API que aun calcula las
    tipologias al vuelo. Ahi no hay nada que contradecir: es exactamente el
    criterio con el que estan hechas las cifras que se enseñan.
  */
  const porForma = porId.size
    ? null
    : new Map(
        grupos
          .map((g): [string, UnitTypeGroup] => [
            formaDe(g.tipologia.propertyType, g.tipologia.bedrooms),
            g,
          ])
          .reverse(),
      )

  /*
    Lo que no esta clasificado tiene su propia fila en la respuesta —sin `id`,
    siempre la ultima— y se usa ESA en vez de deducir una aqui. Es la diferencia
    entre repetir lo que dice la API y opinar por encima: sus `units` y su
    `available` son los que la tarjeta del listado ya sumo, asi que las opciones
    del desplegable y el numero de la tarjeta cuadran sin compensar nada.
  */
  const bolsa = porId.size ? grupos.find((g) => !g.tipologia.id) : undefined

  const sueltas: Property[] = []
  for (const property of properties) {
    const grupo = porForma
      ? porForma.get(formaDe(property.propertyType?.name ?? null, property.bedrooms))
      : property.unitTypeId
        ? porId.get(property.unitTypeId)
        : bolsa
    if (grupo) grupo.unidades.push(property)
    else sueltas.push(property)
  }

  const conUnidades = grupos.filter((g) => g.unidades.length)
  conUnidades.forEach(completar)

  return [...conUnidades, ...derivarTipologias(sueltas)]
}

/**
 * Rellena con las unidades lo que la tipologia no diga.
 *
 * No pisa nada: lo que la agencia escribio manda siempre. Es para los huecos —
 * los baños y los garajes no existian cuando las tipologias se calculaban, y
 * sin esto la ficha de un proyecto ya cargado se queda sin ellos hasta que
 * alguien vuelva a escribir las tres tipologias a mano.
 */
function completar(grupo: UnitTypeGroup): void {
  const t = grupo.tipologia
  const { unidades } = grupo

  t.propertyType ??= unidades[0].propertyType?.name ?? null
  t.bedrooms ??= comun(unidades.map((p) => p.bedrooms))
  t.bathrooms ??= comun(unidades.map((p) => p.bathrooms))
  t.garages ??= comun(unidades.map((p) => p.garages))

  if (t.minArea === null || t.maxArea === null) {
    const areas = unidades.map(areaDe).filter((v): v is number => v !== null)
    t.minArea ??= areas.length ? Math.min(...areas) : null
    t.maxArea ??= areas.length ? Math.max(...areas) : null
  }
  if (t.minPrice === null) {
    const precios = unidades
      .map((p) => p.salePrice)
      .filter((v): v is number => !!v)
    t.minPrice = precios.length ? Math.min(...precios) : null
  }
}

/**
 * La red: tipologias sacadas de las unidades mismas, para las que no tienen
 * ninguna a la que atarse.
 *
 * No es un camino normal ni una segunda fuente de verdad — es un seguro contra
 * un dato incompleto, y a estas alturas casi inalcanzable.
 *
 * Que haya unidades sin clasificar SI es un caso real y corriente: borrar una
 * tipologia desde el panel deja sus inmuebles asi. Pero eso ya no llega hasta
 * aqui, porque la API manda una fila propia para ellas —sin `id`, la ultima— y
 * es esa la que se usa; ver `bolsa` en `agruparPorTipologia()`. Lo unico que
 * cae en esta funcion es lo que ni la tabla ni la bolsa cubren: una unidad que
 * la ficha traiga y que no encaje en ninguna fila. Si alguna vez se ve un grupo
 * con `derivada: true`, es que algo se rompio aguas arriba.
 *
 * Se conserva porque el fallo que evita es caro: un inmueble EN VENTA que
 * desaparece de la web no lo nota nadie. El precio de tenerla es que el
 * desplegable enseñaria una opcion mas de las que dice `unitTypeCount` en la
 * tarjeta; enseñar el inmueble vale mas que cuadrar el numero.
 *
 * Por eso una derivada nunca lleva `code` ni `name`: si se inventara un "Tipo
 * A" competiria con los codigos de verdad de la agencia, y el comprador leeria
 * un nombre que en el panel no existe. Sin codigo, el rotulo cae solo en el
 * tipo de inmueble —"Apartamento · 3 alcobas · 71 – 89 m²"— que describe sin
 * afirmar que alguien lo decidio. Y `derivada` lo deja dicho en el dato, no
 * solo en un comentario.
 *
 * Agrupa por tipo de inmueble y alcobas, que es el criterio con el que la API
 * resumia el proyecto antes de existir la tabla.
 */
function derivarTipologias(properties: Property[]): UnitTypeGroup[] {
  const grupos = new Map<string, UnitTypeGroup>()

  for (const property of properties) {
    const clave = formaDe(property.propertyType?.name ?? null, property.bedrooms)
    let grupo = grupos.get(clave)
    if (!grupo) {
      grupo = {
        derivada: true,
        tipologia: {
          id: null,
          // Nunca un codigo: ver la cabecera de esta funcion.
          code: null,
          name: null,
          // Nadie la escribio, porque nadie escribio la tipologia.
          description: null,
          // Sin alcobas por las que agrupar, lo unico que distingue una unidad
          // de otra es el area: eso es una tipologia AUTO, la de suelo.
          kind: property.bedrooms ? 'FIXED' : 'AUTO',
          propertyType: property.propertyType?.name ?? null,
          units: 0,
          available: 0,
          minArea: null,
          maxArea: null,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          garages: property.garages,
          minPrice: null,
          maxPrice: null,
          position: grupos.size,
        },
        unidades: [],
      }
      grupos.set(clave, grupo)
    }
    grupo.unidades.push(property)
  }

  for (const grupo of grupos.values()) {
    const t = grupo.tipologia
    t.units = grupo.unidades.length
    t.available = grupo.unidades.filter((p) => p.availability === 'AVAILABLE').length
    const areas = grupo.unidades.map(areaDe).filter((v): v is number => v !== null)
    const precios = grupo.unidades
      .map((p) => p.salePrice)
      .filter((v): v is number => !!v)
    t.minArea = areas.length ? Math.min(...areas) : null
    t.maxArea = areas.length ? Math.max(...areas) : null
    t.minPrice = precios.length ? Math.min(...precios) : null
    t.maxPrice = precios.length ? Math.max(...precios) : null
    // Los baños de la tipologia son los de sus unidades solo si coinciden: si
    // no, decir "2 baños" de un grupo donde hay de 1 y de 2 es mentir.
    t.bathrooms = comun(grupo.unidades.map((p) => p.bathrooms))
    t.garages = comun(grupo.unidades.map((p) => p.garages))
  }

  return [...grupos.values()].sort(
    (a, b) => (a.tipologia.minArea ?? 0) - (b.tipologia.minArea ?? 0),
  )
}

/** El area por la que se compara una unidad: la construida, o la del lote. */
export function areaDe(property: Property): number | null {
  return property.builtArea ?? property.area ?? null
}

/**
 * Como se nombra la tipologia de un inmueble suelto, al lado del proyecto:
 * "BOSQUES DEL HATO · Tipo A".
 *
 * Solo con el codigo, que es lo unico traducible —"A" es "A" en los dos
 * idiomas—. El `name` de la fila viene compuesto y en español, y la fila de lo
 * que la API no tiene clasificado se llama literalmente "Sin clasificar": ese
 * cartel es para el panel, no para quien esta mirando el inmueble. Sin codigo,
 * no se dice nada, que es mejor que decirlo mal.
 */
export function nombreTipologia(
  unitType: Property['unitType'],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!unitType) return null
  // La API vieja lo servia como texto libre. Esta vacio en todo el inventario,
  // pero si alguien lo hubiera escrito a mano, es lo que quiso escribir.
  if (typeof unitType === 'string') return unitType.trim() || null
  return unitType.code ? t('project.unitType.code', { code: unitType.code }) : null
}

/** Un proyecto de suelo no tiene alcobas ni baños: no hay nada que pintar. */
export function esSuelo(tipologia: UnitTypeSummary): boolean {
  return tipologia.kind === 'AUTO' || !tipologia.bedrooms
}

function formaDe(propertyType: string | null, bedrooms: number | null): string {
  return `${propertyType ?? ''}|${bedrooms ?? ''}`
}

function comun(valores: (number | null)[]): number | null {
  const primero = valores[0] ?? null
  return valores.every((v) => (v ?? null) === primero) ? primero : null
}

function limpiar(value: string | null | undefined): string | null {
  return value?.trim() || null
}

function cifra(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function entero(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value)
}

/**
 * El endpoint devolvia un array plano antes de paginarse. Mientras la API en
 * produccion no lleve la version paginada, el sitio seguiria recibiendo el
 * array viejo: envolverlo aqui evita que el listado reviente en ese hueco.
 */
function asPaginated(
  payload: Paginated<ProjectSummary> | ProjectSummary[],
  page: number,
  limit: number,
): Paginated<ProjectSummary> {
  if (!Array.isArray(payload)) return payload
  const total = payload.length
  const pages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    data: payload.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, pages, hasNext: page < pages },
  }
}
