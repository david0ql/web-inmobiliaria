import { Search } from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/misc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONDITIONS,
  digits,
  EMPTY_FILTERS,
  ROOM_OPTIONS,
  writeFilters,
  type Filters,
} from '@/lib/search-params'
import { getZones } from '@/lib/api'
import { ROUTES } from '@/lib/site'
import { useSiteData } from '@/lib/site-data'
import type { Zone } from '@/lib/types'

/** Radix no admite `value=""`; el "Todos" necesita un centinela propio. */
const ANY = '__any__'

/*
  Once campos y el boton: doce casillas iguales.

  Doce esta elegido, no es casualidad. Es lo unico que reparte exacto en dos,
  tres y cuatro columnas —seis filas, cuatro filas, tres filas—, asi que a
  ninguna anchura sobra una casilla al final. Con once quedaba un hueco: la
  rejilla se veia empezada y sin terminar.

  La casilla doce no es relleno. Es "Palabra o codigo", que faltaba: la busqueda
  por texto ya la aceptaba la API y viajaba en la URL, pero no habia donde
  escribirla, y es lo primero que necesita quien llama con un codigo de un
  portal en la mano.

  Antes los tramos iban de 3, 3, 3, 3, 2, 2, 2, 2 y 4, y en pantallas medianas
  unos campos ocupaban la fila entera y otros la mitad: eso era lo que se veia
  torcido.

  Cuatro columnas y no tres porque un desplegable que solo dice "Todos" no
  necesita 340 px: con 250 se lee igual y el buscador pasa de cuatro filas a
  tres. Lo mismo por dentro —casillas de 36 px en vez de 40, etiqueta pequena y
  pegada— para que el formulario no se coma la pantalla antes de que aparezca
  un solo inmueble, que es a lo que viene la gente.
*/
const CELDA = 'min-w-0'
const CONTROL = 'h-9'
const REJILLA =
  'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'

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
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className={CELDA}>
          <Skeleton className="mb-1 h-2.5 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

function AdvancedSearchForm({ initial }: { initial?: Filters }) {
  const navigate = useNavigate()
  const { catalogs } = useSiteData()
  const [filters, setFilters] = useState<Filters>(initial ?? EMPTY_FILTERS)
  const [zones, setZones] = useState<Zone[]>([])

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  /*
    Pais, departamento y ciudad van en cascada: elegir Colombia deja solo sus
    departamentos, y elegir Santander solo sus ciudades. Sin eso "Pais" seria un
    adorno que no cambia nada de lo que hay debajo.

    Las tres listas salen del inventario, no del catalogo: en las tablas hay 38
    paises y 943 departamentos porque el volcado traia el mundo entero, y un
    desplegable con 37 paises que no devuelven nada es peor que no tenerlo.
  */
  const departamentos = useMemo(
    () =>
      catalogs.geo.regions.filter(
        (region) =>
          !filters.countryId || String(region.countryId) === filters.countryId,
      ),
    [catalogs.geo.regions, filters.countryId],
  )

  const ciudades = useMemo(
    () =>
      catalogs.geo.cities.filter(
        (city) =>
          (!filters.countryId ||
            String(city.countryId) === filters.countryId) &&
          (!filters.regionId || String(city.regionId) === filters.regionId),
      ),
    [catalogs.geo.cities, filters.countryId, filters.regionId],
  )

  // Los barrios se piden por ciudad: en toda Colombia son varios miles y no
  // caben en un desplegable ni en una respuesta razonable.
  useEffect(() => {
    if (!filters.cityId) {
      setZones([])
      return
    }
    const controller = new AbortController()
    getZones(Number(filters.cityId), controller.signal)
      .then(setZones)
      .catch(() => setZones([]))
    return () => controller.abort()
  }, [filters.cityId])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(`${ROUTES.search}?${writeFilters({ ...filters, page: 1 })}`)
  }

  return (
    <form onSubmit={submit} className={REJILLA} aria-label="Búsqueda avanzada">
      <FieldShell label="País" className={CELDA}>
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
          <SelectTrigger className={CONTROL} aria-label="País">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {catalogs.geo.countries.map((country) => (
              <SelectItem key={country.id} value={String(country.id)}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Departamento" className={CELDA}>
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
          <SelectTrigger className={CONTROL} aria-label="Departamento">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {departamentos.map((region) => (
              <SelectItem key={region.id} value={String(region.id)}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Ciudad" className={CELDA}>
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
          <SelectTrigger className={CONTROL} aria-label="Ciudad">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
            {ciudades.map((city) => (
              <SelectItem key={city.id} value={String(city.id)}>
                {/* Con el numero al lado: quien elige "Girón" agradece saber
                    que hay 74 antes de pulsar buscar. */}
                {city.name} ({city.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Zona / barrio" className={CELDA}>
        <Select
          value={filters.zoneId || ANY}
          onValueChange={(value) => set('zoneId', value === ANY ? '' : value)}
          disabled={!filters.cityId || zones.length === 0}
        >
          <SelectTrigger className={CONTROL} aria-label="Zona / barrio">
            <SelectValue
              placeholder={filters.cityId ? 'Todos' : 'Elige ciudad'}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {zones.map((zone) => (
              <SelectItem key={zone.id} value={String(zone.id)}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Tipo de inmueble" className={CELDA}>
        <Select
          value={filters.propertyTypeId || ANY}
          onValueChange={(value) =>
            set('propertyTypeId', value === ANY ? '' : value)
          }
        >
          <SelectTrigger className={CONTROL} aria-label="Tipo de inmueble">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {catalogs.propertyTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Estado" className={CELDA}>
        <Select
          value={filters.condition || ANY}
          onValueChange={(value) => set('condition', value === ANY ? '' : value)}
        >
          <SelectTrigger className={CONTROL} aria-label="Estado">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {CONDITIONS.map((condition) => (
              <SelectItem key={condition.value} value={condition.value}>
                {condition.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Alcobas" className={CELDA}>
        <RoomSelect
          label="Alcobas"
          value={filters.bedrooms}
          onChange={(value) => set('bedrooms', value)}
        />
      </FieldShell>

      <FieldShell label="Baños" className={CELDA}>
        <RoomSelect
          label="Baños"
          value={filters.bathrooms}
          onChange={(value) => set('bathrooms', value)}
        />
      </FieldShell>

      <FieldShell label="Precio desde" className={CELDA}>
        <Input
          className={CONTROL}
          aria-label="Precio desde"
          inputMode="numeric"
          placeholder="Desde"
          value={filters.minPrice}
          onChange={(event) => set('minPrice', digits(event.target.value))}
        />
      </FieldShell>

      <FieldShell label="Precio hasta" className={CELDA}>
        <Input
          className={CONTROL}
          aria-label="Precio hasta"
          inputMode="numeric"
          placeholder="Hasta"
          value={filters.maxPrice}
          onChange={(event) => set('maxPrice', digits(event.target.value))}
        />
      </FieldShell>

      <FieldShell label="Palabra o código" className={CELDA}>
        <Input
          className={CONTROL}
          aria-label="Palabra o código"
          placeholder="Ej. 9650807, campestre…"
          value={filters.match}
          onChange={(event) => set('match', event.target.value)}
        />
      </FieldShell>

      {/*
        El boton mide lo que un campo, ni mas. Buscar no es una decision que
        haya que empujar con una barra negra de lado a lado: quien llega aqui ya
        venia a buscar. Tampoco se lleva una franja entera para el solo, que era
        lo que empujaba los destacados por debajo del pliegue.

        `items-end` porque esta celda no tiene etiqueta encima: sin eso el boton
        subiria y quedaria a distinta altura que sus vecinas.
      */}
      <div className="flex min-w-0 items-end">
        <Button type="submit" className="h-9 w-full font-bold tracking-widest">
          <Search />
          BUSCAR
        </Button>
      </div>
    </form>
  )
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
  return (
    <Select
      value={value || ANY}
      onValueChange={(next) => onChange(next === ANY ? '' : next)}
    >
      <SelectTrigger className={CONTROL} aria-label={label}>
        <SelectValue placeholder="Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Todos</SelectItem>
        {ROOM_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
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
