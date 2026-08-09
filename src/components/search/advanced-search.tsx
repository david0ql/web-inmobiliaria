import { Eraser, Search } from 'lucide-react'
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
  countActive,
  digits,
  EMPTY_FILTERS,
  ROOM_OPTIONS,
  toApiQuery,
  writeFilters,
  type Filters,
} from '@/lib/search-params'
import { getFacets, type FacetOption, type Facets } from '@/lib/api'
import { ROUTES } from '@/lib/site'
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
  const navigate = useNavigate()
  const { catalogs } = useSiteData()
  const [filters, setFilters] = useState<Filters>(initial ?? EMPTY_FILTERS)
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
            <Opciones lista={opciones.countries} />
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
            <Opciones lista={opciones.regions} />
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
            <Opciones lista={opciones.cities} />
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Zona / barrio" className={CELDA}>
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
          <SelectTrigger className={CONTROL} aria-label="Zona / barrio">
            <SelectValue
              placeholder={filters.cityId ? 'Todos' : 'Elige ciudad'}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            <Opciones lista={opciones.zones} />
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
            <Opciones lista={opciones.propertyTypes} />
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

      <FieldShell label="Alcobas" className={ESTRECHA}>
        <RoomSelect
          label="Alcobas"
          value={filters.bedrooms}
          onChange={(value) => set('bedrooms', value)}
        />
      </FieldShell>

      <FieldShell label="Baños" className={ESTRECHA}>
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
          BUSCAR
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
            aria-label={`Limpiar ${activos} filtro${activos > 1 ? 's' : ''}`}
            title="Limpiar todos los filtros"
            className="size-9 shrink-0 p-0"
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              navigate(ROUTES.search)
            }}
          >
            <Eraser className="size-4" />
          </Button>
        )}
      </div>
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
function Opciones({ lista }: { lista: FacetOption[] }) {
  return (
    <>
      {lista.map((opcion) => (
        <SelectItem key={opcion.id} value={String(opcion.id)}>
          {opcion.name}{' '}
          <span className="text-muted-foreground">({opcion.count})</span>
        </SelectItem>
      ))}
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
