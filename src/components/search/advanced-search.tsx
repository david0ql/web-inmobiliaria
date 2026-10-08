import { Eraser, Search, SlidersHorizontal } from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigate } from '@/lib/nav'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RangoPrecio } from '@/components/search/rango-precio'
import { Skeleton } from '@/components/ui/misc'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONDITIONS,
  countActive,
  DEPARTAMENTO_POR_DEFECTO,
  EMPTY_FILTERS,
  PAIS_POR_DEFECTO,
  ROOM_OPTIONS,
  toApiQuery,
  writeFilters,
  type Filters,
} from '@/lib/search-params'
import { getFacets, type FacetOption, type Facets } from '@/lib/api'
import { empezarVueloMapa } from '@/lib/hero-map'
import { useT } from '@/lib/i18n'
import { ROUTES } from '@/lib/site'
import { usePantallaEstrecha } from '@/lib/pantalla'
import { useSiteData } from '@/lib/site-data'

/** Radix no admite `value=""`; el "Todos" necesita un centinela propio. */
const ANY = '__any__'

/*
  Diez campos y el boton, en una rejilla que no deja huecos a ninguna anchura.

  El reparto no es el mismo en todas: es el que cuadra en cada una.

    movil       1 campo por fila
    tableta     2 por fila, y el boton ocupa la ultima entera
    mediana     3 por fila; la ultima sale 1 campo + el boton, que vale por dos
    portatil    4 por fila; la ultima sale 2 campos + el boton, que vale por dos
    escritorio  5 huecos por fila, y cuadra exacto en dos filas

  En escritorio la rejilla es de diez unidades y cada campo vale dos, salvo
  Alcobas y Banos, que valen una. Esos dos no guardan mas que "Todos" o un
  digito: darles el ancho de "Precio desde" es regalar espacio, y juntos ocupan
  el hueco de un campo normal, asi que la fila se sigue leyendo en cinco.

  Antes los tramos iban de 3, 3, 3, 3, 2, 2, 2, 2 y 4, y en pantallas medianas
  unos campos ocupaban la fila entera y otros la mitad: eso era lo que se veia
  torcido. Y las casillas son de 36 px y no de 40, con la etiqueta pequena y
  pegada, para que el formulario no se coma la pantalla antes de que aparezca un
  solo inmueble, que es a lo que viene la gente.
*/
const CELDA = 'min-w-0 xl:col-span-2'
const ESTRECHA = 'min-w-0 xl:col-span-1'
const CONTROL = 'h-9'
const REJILLA =
  'grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-10'

/**
 * "BÚSQUEDA AVANZADA", con los mismos campos y en el mismo orden que el sitio
 * actual. Al enviar navega a `/s` con los filtros en la URL: no guarda estado
 * suyo, de modo que la busqueda es compartible y el boton atras funciona.
 */
/**
 * Los desplegables dependen del catalogo, que llega despues del primer pintado.
 * La barrera vive aqui dentro para que quien la use no tenga que acordarse: el
 * formulario aparece en su hueco exacto y no salta nada cuando se rellena.
 */
export function AdvancedSearch({ initial }: { initial?: Filters }) {
  return (
    <Suspense fallback={<SearchFormSkeleton />}>
      <AdvancedSearchForm initial={initial} />
    </Suspense>
  )
}

function SearchFormSkeleton() {
  return (
    <div className={REJILLA} aria-hidden="true">
      {Array.from({ length: 11 }, (_, index) => (
        <div key={index} className={CELDA}>
          <Skeleton className="mb-1 h-2.5 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

function AdvancedSearchForm({ initial }: { initial?: Filters }) {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { catalogs } = useSiteData()
  /*
    Se arranca donde opera la agencia.

    El inventario entero esta en Santander, asi que abrir con "Todos" en pais y
    en departamento es un paso de mas para todo el mundo. Se puede quitar: son
    filtros normales, no una restriccion.

    Solo cuando no venia nada en la URL. Si alguien llega con una busqueda
    compartida —o le da a atras—, manda lo que trae, aunque sea "Todos".
  */
  const [filters, setFilters] = useState<Filters>(
    initial ?? {
      ...EMPTY_FILTERS,
      countryId: PAIS_POR_DEFECTO,
      regionId: DEPARTAMENTO_POR_DEFECTO,
    },
  )
  const compacto = usePantallaEstrecha()
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [facets, setFacets] = useState<Facets | null>(null)

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  /*
    Las cinco listas llegan contadas y ya filtradas por lo que haya elegido: al
    marcar Floridablanca, los barrios pasan de 139 a 24 y los tipos de 12 a 9,
    cada uno con cuantos hay DENTRO de Floridablanca. Un desplegable que ofrece
    un camino que acaba en cero es peor que no ofrecerlo.

    Se piden a la API en vez de calcularse aqui porque el navegador no tiene los
    inmuebles: tendria que descargarse los 642 para contarlos, y aun asi se
    quedaria desfasado en cuanto la agencia publique uno.

    Con retraso corto: los precios se escriben digito a digito y no hace falta
    una consulta por tecla.
  */
  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => {
      getFacets(toApiQuery({ ...filters, page: 1 }, 1), controller.signal)
        .then(setFacets)
        .catch(() => {
          /* Si fallan, los desplegables se quedan como estaban. */
        })
    }, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [filters])

  /*
    Mientras llega la primera respuesta se usa la geografia del catalogo, que ya
    viene con la pagina: asi los desplegables no aparecen vacios ni dan un salto
    al rellenarse.
  */
  const opciones = useMemo(
    () => ({
      countries: facets?.countries ?? catalogs.geo.countries.map(conCuenta),
      regions: facets?.regions ?? catalogs.geo.regions.map(conCuenta),
      cities: facets?.cities ?? catalogs.geo.cities.map(conCuenta),
      zones: facets?.zones ?? [],
      propertyTypes:
        facets?.propertyTypes ?? catalogs.propertyTypes.map(conCuenta),
    }),
    [facets, catalogs],
  )

  // Cuantos filtros ha tocado el visitante, sin contar el orden ni la pagina.
  const activos = countActive(filters)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    /*
      Se congela el mapa que hay en pantalla justo antes de navegar.

      Tiene que ser aqui y no en el buscador: en este instante el mapa de la
      portada existe todavia y se puede medir. Un cuadro despues, React ya lo ha
      desmontado. Si no hay mapa a la vista —el formulario tambien vive en
      `/buscar`, donde el que manda es el panel de la derecha— la llamada no hace
      nada y la navegacion es la de siempre.
    */
    setFiltrosAbiertos(false)
    empezarVueloMapa()
    navigate(`${ROUTES.search}?${writeFilters({ ...filters, page: 1 })}`)
  }

  /*
    Los campos, una sola vez.

    Se declaran aqui y se colocan donde toque: en escritorio dentro de la
    rejilla, en movil dentro de la hoja de filtros. Pintarlos en los dos sitios
    duplicaria los identificadores de los desplegables y, sobre todo, el estado
    interno de cada buscador de opciones.
  */
  const campos = (
    <>
      {/*
        Buscar por palabra, lo primero.

        Es como busca quien ya sabe algo: un codigo que le pasaron, el nombre de
        un conjunto, "Cabecera". Hasta ahora eso solo existia en la lupa de la
        barra negra —que se ha retirado— y el formulario obligaba a traducir una
        idea concreta a cinco desplegables.
      */}
      <FieldShell
        label={t('search.field.match')}
        className="min-w-0 sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-10"
      >
        <Input
          className={CONTROL}
          aria-label={t('search.field.match')}
          placeholder={t('search.match.placeholder')}
          value={filters.match}
          onChange={(event) => set('match', event.target.value)}
        />
      </FieldShell>

      <FieldShell label={t('search.field.country')} className={CELDA}>
        <Select
          value={filters.countryId || ANY}
          onValueChange={(value) => {
            // Cambiar de pais invalida todo lo de debajo: son listas distintas.
            setFilters((current) => ({
              ...current,
              countryId: value === ANY ? '' : value,
              regionId: '',
              cityId: '',
              zoneId: '',
            }))
          }}
        >
          <SelectTrigger className={CONTROL} aria-label={t('search.field.country')}>
            <SelectValue placeholder={t('search.option.all.m')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
            <Opciones lista={opciones.countries} buscable />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.region')} className={CELDA}>
        <Select
          value={filters.regionId || ANY}
          onValueChange={(value) => {
            setFilters((current) => ({
              ...current,
              regionId: value === ANY ? '' : value,
              cityId: '',
              zoneId: '',
            }))
          }}
        >
          <SelectTrigger className={CONTROL} aria-label={t('search.field.region')}>
            <SelectValue placeholder={t('search.option.all.m')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
            <Opciones lista={opciones.regions} buscable />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.city')} className={CELDA}>
        <Select
          value={filters.cityId || ANY}
          onValueChange={(value) => {
            // Cambiar de ciudad invalida el barrio: son listas distintas.
            setFilters((current) => ({
              ...current,
              cityId: value === ANY ? '' : value,
              zoneId: '',
            }))
          }}
        >
          <SelectTrigger className={CONTROL} aria-label={t('search.field.city')}>
            <SelectValue placeholder={t('search.option.all.f')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.f')}</SelectItem>
            <Opciones lista={opciones.cities} buscable />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.zone')} className={CELDA}>
        <Select
          value={filters.zoneId || ANY}
          onValueChange={(value) => set('zoneId', value === ANY ? '' : value)}
          /*
            El barrio pide ciudad primero. Sin ella la lista son los 139 barrios
            de once municipios, muchos con el mismo nombre en dos sitios
            distintos: elegir ahi es adivinar. Con la ciudad puesta son
            veintitantos y cada uno significa algo.
          */
          disabled={!filters.cityId || opciones.zones.length === 0}
        >
          <SelectTrigger className={CONTROL} aria-label={t('search.field.zone')}>
            {/*
              El aviso va en el propio disparador y no como `placeholder`: el
              valor nunca esta vacio —"Todos" es una opcion de verdad, porque
              Radix no admite la cadena vacia—, asi que el `placeholder` no
              llegaba a pintarse nunca y el campo solo se veia gris, sin decir
              por que.
            */}
            {filters.cityId ? (
              <SelectValue />
            ) : (
              <span>{t('search.zone.needsCity')}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
            <Opciones lista={opciones.zones} buscable />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.propertyType')} className={CELDA}>
        <Select
          value={filters.propertyTypeId || ANY}
          onValueChange={(value) =>
            set('propertyTypeId', value === ANY ? '' : value)
          }
        >
          <SelectTrigger
            className={CONTROL}
            aria-label={t('search.field.propertyType')}
          >
            <SelectValue placeholder={t('search.option.all.m')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
            <Opciones
              lista={opciones.propertyTypes}
              prefijo="catalog.propertyType"
              buscable
            />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.condition')} className={CELDA}>
        <Select
          value={filters.condition || ANY}
          onValueChange={(value) => set('condition', value === ANY ? '' : value)}
        >
          <SelectTrigger
            className={CONTROL}
            aria-label={t('search.field.condition')}
          >
            <SelectValue placeholder={t('search.option.all.m')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
            {CONDITIONS.map((condition) => (
              <SelectItem key={condition.value} value={condition.value}>
                {t(condition.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label={t('search.field.bedrooms')} className={ESTRECHA}>
        <RoomSelect
          label={t('search.field.bedrooms')}
          value={filters.bedrooms}
          onChange={(value) => set('bedrooms', value)}
        />
      </FieldShell>

      <FieldShell label={t('search.field.bathrooms')} className={ESTRECHA}>
        <RoomSelect
          label={t('search.field.bathrooms')}
          value={filters.bathrooms}
          onChange={(value) => set('bathrooms', value)}
        />
      </FieldShell>

      <FieldShell label={t('search.field.garages')} className={ESTRECHA}>
        <RoomSelect
          label={t('search.field.garages')}
          value={filters.garages}
          onChange={(value) => set('garages', value)}
        />
      </FieldShell>

      {/*
        El rango sustituye a las dos casillas de precio y se lleva TODO lo que
        queda de la fila: estado (2) mas alcobas, baños y parqueaderos (1 cada
        uno) suman cinco de las diez columnas, asi que aqui van las otras cinco.
        Con cuatro quedaba una columna muerta al final y la fila se veia
        descuadrada por la derecha.
      */}
      <FieldShell label="" className="min-w-0 sm:col-span-2 xl:col-span-5">
        <RangoPrecio
          min={filters.minPrice}
          max={filters.maxPrice}
          onChange={(min, max) =>
            setFilters((current) => ({ ...current, minPrice: min, maxPrice: max }))
          }
        />
      </FieldShell>
    </>
  )

  /*
    LA HOJA DE "MAS FILTROS", una sola para las dos pantallas.

    En movil es donde vive el formulario entero; en escritorio, lo que no cabe
    arriba. Antes habia dos copias y solo la de movil existia, asi que el enlace
    de escritorio no abria nada.
  */
  const hojaDeFiltros = (
    <Sheet open={filtrosAbiertos} onOpenChange={setFiltrosAbiertos}>
      <SheetContent side="bottom" className="flex h-[92dvh] flex-col gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>{t('search.filters.title')}</SheetTitle>
          <SheetDescription>{t('search.filters.detail')}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/*
            LO QUE MUEVE A COMPRAR, antes que las caracteristicas.

            Un buscador de inmuebles pregunta por alcobas y baños, que es lo que
            describe la casa. Lo que decide una compra suele ser otra cosa: "la
            necesito ya". Esa urgencia no estaba en ninguna parte y es la que
            separa a quien mira de quien firma.

            De momento una, la que la agencia pidio primero. Las demas se
            añaden aqui, en este mismo bloque y por delante de los campos.
          */}
          <fieldset className="mb-5 rounded-lg border bg-secondary/40 p-4">
            <legend className="px-1.5 text-xs font-semibold tracking-wide uppercase">
              {t('search.motivation.title')}
            </legend>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={filters.readyToMoveIn === 'true'}
                onChange={(event) =>
                  set('readyToMoveIn', event.target.checked ? 'true' : '')
                }
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t('search.motivation.ready')}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t('search.motivation.ready.detail')}
                </span>
              </span>
            </label>
          </fieldset>

          <div className="grid grid-cols-1 gap-3">{campos}</div>
        </div>

        {/*
          El pie se queda fijo: en una hoja de diez campos, un boton al final
          del scroll es un boton que no se encuentra.
        */}
        <div className="flex items-center gap-2 border-t bg-background p-4">
          {activos > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setFilters({ ...EMPTY_FILTERS, businessType: filters.businessType })
                navigate(pathname)
              }}
            >
              <Eraser className="size-4" />
              {t('search.clear.title')}
            </Button>
          )}
          {/*
            `type="button"` con `onClick`, y no `type="submit"`.

            ESTE ERA EL BUG: la hoja de Radix se pinta en un portal, al final
            del `body`, asi que su contenido NO esta dentro del `<form>` aunque
            lo parezca en el codigo. Un boton de envio sin formulario encima no
            hace nada: ni buscaba ni cerraba, y desde el movil no habia forma de
            lanzar la busqueda. Llamando a `submit` a mano da igual donde este
            pintado.
          */}
          <Button
            type="button"
            onClick={submit}
            className="h-11 flex-1 font-bold tracking-widest"
          >
            <Search />
            {t('search.submit')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )

  /*
    EN MOVIL, LA BUSQUEDA SE PARTE EN DOS.

    Antes el formulario entero —diez desplegables, uno debajo de otro— era lo
    primero de la portada y lo primero del buscador. En un telefono eso son casi
    dos pantallas de casillas vacias antes de ver un solo inmueble, y para
    buscar "apartamento en Cabecera" habia que pasar por pais, departamento,
    zona, estado, alcobas, baños y dos precios.

    Ahora hay una linea: la ciudad y el boton. Es lo que de verdad usa casi
    todo el mundo, y lo demas se pide detras de un boton de filtros que dice
    cuantos hay puestos. Los filtros se abren en una hoja a pantalla completa,
    con secciones y con el resumen abajo, donde el pulgar llega.

    En escritorio no cambia nada: ahi caben los diez campos en dos filas y
    esconderlos seria quitar algo que ya funcionaba.
  */
  if (compacto) {
    return (
      <form onSubmit={submit} aria-label={t('search.form.aria')}>
        {/*
          La palabra va primera y sola, a lo ancho.

          En un telefono es el camino mas corto que hay: quien llega con un
          codigo, el nombre de un conjunto o un barrio en la cabeza lo escribe y
          ya esta, sin abrir un solo desplegable. Debajo queda la ciudad, que es
          el filtro que de verdad se usa cuando no se tiene una palabra.
        */}
        <FieldShell label={t('search.field.match')} className="mb-2 min-w-0">
          <Input
            className={CONTROL}
            aria-label={t('search.field.match')}
            placeholder={t('search.match.placeholder')}
            value={filters.match}
            onChange={(event) => set('match', event.target.value)}
          />
        </FieldShell>

        <div className="flex items-end gap-2">
          <FieldShell label={t('search.field.city')} className="min-w-0 flex-1">
            <Select
              value={filters.cityId || ANY}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  cityId: value === ANY ? '' : value,
                  zoneId: '',
                }))
              }
            >
              <SelectTrigger className={CONTROL} aria-label={t('search.field.city')}>
                <SelectValue placeholder={t('search.option.all.f')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t('search.option.all.f')}</SelectItem>
                <Opciones lista={opciones.cities} buscable />
              </SelectContent>
            </Select>
          </FieldShell>

          <Button type="submit" className="h-9 shrink-0 px-4 font-bold tracking-widest">
            <Search />
            {t('search.submit')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setFiltrosAbiertos(true)}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium"
        >
          <SlidersHorizontal className="size-4" />
          {t('search.more_filters')}
          {activos > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {activos}
            </span>
          )}
        </button>

        {hojaDeFiltros}
      </form>
    )
  }

  return (
    <form
      onSubmit={submit}
      className={REJILLA}
      aria-label={t('search.form.aria')}
    >
      {/*
        Los campos se pintan UNA vez y se colocan en dos sitios distintos:
        en escritorio, dentro de la rejilla; en movil, dentro de la hoja de
        filtros. Pintarlos dos veces duplicaria identificadores y estado.
      */}
      {campos}

      {/*
        El boton mide lo que un campo, ni mas. Buscar no es una decision que
        haya que empujar con una barra negra de lado a lado: quien llega aqui ya
        venia a buscar. Tampoco se lleva una franja entera para el solo, que era
        lo que empujaba los destacados por debajo del pliegue.

        `items-end` porque esta celda no tiene etiqueta encima: sin eso el boton
        subiria y quedaria a distinta altura que sus vecinas.
      */}
      <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-2">
        <Button type="submit" className="h-9 flex-1 font-bold tracking-widest">
          <Search />
          {t('search.submit')}
        </Button>
        {/*
          Limpiar comparte celda con Buscar en vez de tener la suya: una casilla
          entera para deshacer, al lado de la de hacer, le da el mismo peso a
          las dos cosas, y no lo tienen. Y solo aparece cuando hay algo que
          limpiar, que es cuando significa algo.
        */}
        {activos > 0 && (
          <Button
            type="button"
            variant="outline"
            aria-label={
              activos > 1
                ? t('search.clear.other', { count: activos })
                : t('search.clear.one', { count: activos })
            }
            title={t('search.clear.title')}
            className="size-9 shrink-0 p-0"
            onClick={() => {
              // Se conserva lo que impone la ruta —en `/venta`, la venta— y se
              // vuelve a la misma pantalla sin query: limpiar los filtros no es
              // pedir que te saquen de donde estabas.
              setFilters({ ...EMPTY_FILTERS, businessType: filters.businessType })
              navigate(pathname)
            }}
          >
            <Eraser className="size-4" />
          </Button>
        )}
      </div>

      {/*
        "Mas filtros", debajo de Buscar y en toda la rejilla.

        Va como palabra y no como boton con marco: lo de arriba es la busqueda
        que usa todo el mundo y esto es la puerta a lo que usa alguno. Darle el
        mismo peso visual que a Buscar invitaria a abrirlo siempre, que es justo
        lo contrario de por que existe.
      */}
      <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-10">
        <button
          type="button"
          onClick={() => setFiltrosAbiertos(true)}
          className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" />
          {t('search.more_filters')}
          {activos > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activos}
            </span>
          )}
        </button>
      </div>

      {hojaDeFiltros}
    </form>
  )
}

/**
 * Las opciones de un desplegable, con cuantos inmuebles hay detras.
 *
 * El numero al lado no es adorno: es lo que evita elegir "Cabaña" y encontrarse
 * con una pagina vacia. Y las que se quedan en cero no llegan siquiera —la API
 * solo devuelve lo que existe—, asi que la lista se acorta sola conforme se
 * afina la busqueda.
 */
function Opciones({
  lista,
  prefijo,
  buscable = false,
}: {
  lista: FacetOption[]
  /*
    Si se pasa, cada opcion se traduce por su identificador. Lo usan los tipos
    de inmueble: sus nombres salen de la base y en ingles seguian diciendo
    "Casa" y "Bodega". Las ciudades y los barrios no lo llevan, porque son
    nombres propios y no se traducen.
  */
  prefijo?: string
  buscable?: boolean
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const visible = query.trim()
    ? lista.filter((opcion) =>
        opcion.name.localeCompare(query.trim(), undefined, {
          sensitivity: 'base',
          usage: 'search',
        }) === 0 ||
        opcion.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      )
    : lista
  return (
    <>
      {buscable && lista.length > 6 && (
        <div
          className="sticky top-0 z-10 bg-popover p-1"
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.option.filter')}
            aria-label={t('search.option.filter')}
            className="h-9"
          />
        </div>
      )}
      {visible.map((opcion) => (
        <SelectItem key={opcion.id} value={String(opcion.id)}>
          {prefijo ? t(`${prefijo}.${opcion.id}`, undefined, opcion.name) : opcion.name}{' '}
          <span className="text-muted-foreground">({opcion.count})</span>
        </SelectItem>
      ))}
      {visible.length === 0 && (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          {t('search.option.noResults')}
        </p>
      )}
    </>
  )
}

/** El catalogo no trae cuentas; hasta que llegan las de verdad, ninguna. */
function conCuenta(item: { id: number; name: string; count?: number }) {
  return { id: item.id, name: item.name, count: item.count ?? 0 }
}

/** Se usa para alcobas y para banos: el nombre accesible viene de fuera. */
function RoomSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const t = useT()
  return (
    <Select
      value={value || ANY}
      onValueChange={(next) => onChange(next === ANY ? '' : next)}
    >
      <SelectTrigger className={CONTROL} aria-label={label}>
        <SelectValue placeholder={t('search.option.all.m')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{t('search.option.all.m')}</SelectItem>
        {ROOM_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t('search.rooms.option', { count: option.value })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FieldShell({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}
