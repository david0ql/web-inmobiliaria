import { Search } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
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
  BUSINESS_TYPES,
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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-12" aria-hidden="true">
      {[
        'col-span-2 lg:col-span-3',
        'col-span-2 lg:col-span-3',
        'col-span-2 lg:col-span-3',
        'col-span-1 lg:col-span-3',
        'col-span-1 lg:col-span-3',
        'col-span-1 lg:col-span-2',
        'col-span-1 lg:col-span-2',
        'col-span-1 lg:col-span-2',
        'col-span-1 lg:col-span-2',
        'col-span-2 lg:col-span-3',
      ].map((span, index) => (
        <div key={index} className={span}>
          <Skeleton className="mb-1.5 h-3 w-20" />
          <Skeleton className="h-10 w-full" />
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
    <form
      onSubmit={submit}
      className="grid grid-cols-2 gap-4 lg:grid-cols-12"
      aria-label="Búsqueda avanzada"
    >
      <FieldShell label="Ciudad" className="col-span-2 lg:col-span-3">
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
          <SelectTrigger aria-label="Ciudad">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todas</SelectItem>
            {catalogs.cities.map((city) => (
              <SelectItem key={city.id} value={String(city.id)}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Zona / barrio" className="col-span-2 lg:col-span-3">
        <Select
          value={filters.zoneId || ANY}
          onValueChange={(value) => set('zoneId', value === ANY ? '' : value)}
          disabled={!filters.cityId || zones.length === 0}
        >
          <SelectTrigger aria-label="Zona / barrio">
            <SelectValue placeholder={filters.cityId ? 'Todos' : 'Elige ciudad'} />
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

      <FieldShell label="Tipo de inmueble" className="col-span-2 lg:col-span-3">
        <Select
          value={filters.propertyTypeId || ANY}
          onValueChange={(value) =>
            set('propertyTypeId', value === ANY ? '' : value)
          }
        >
          <SelectTrigger aria-label="Tipo de inmueble">
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

      <FieldShell label="Estado" className="col-span-1 lg:col-span-3">
        <Select
          value={filters.condition || ANY}
          onValueChange={(value) => set('condition', value === ANY ? '' : value)}
        >
          <SelectTrigger aria-label="Estado">
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

      <FieldShell label="Tipo de negocio" className="col-span-1 lg:col-span-3">
        <Select
          value={filters.businessType || ANY}
          onValueChange={(value) =>
            set('businessType', value === ANY ? '' : value)
          }
        >
          <SelectTrigger aria-label="Tipo de negocio">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Todos</SelectItem>
            {BUSINESS_TYPES.map((business) => (
              <SelectItem key={business.value} value={business.value}>
                {business.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldShell>

      <FieldShell label="Alcobas" className="col-span-1 lg:col-span-2">
        <RoomSelect
          label="Alcobas"
          value={filters.bedrooms}
          onChange={(value) => set('bedrooms', value)}
        />
      </FieldShell>

      <FieldShell label="Baños" className="col-span-1 lg:col-span-2">
        <RoomSelect
          label="Baños"
          value={filters.bathrooms}
          onChange={(value) => set('bathrooms', value)}
        />
      </FieldShell>

      <FieldShell label="Precio desde" className="col-span-1 lg:col-span-2">
        <Input
          aria-label="Precio desde"
          inputMode="numeric"
          placeholder="Desde"
          value={filters.minPrice}
          onChange={(event) => set('minPrice', digits(event.target.value))}
        />
      </FieldShell>

      <FieldShell label="Precio hasta" className="col-span-1 lg:col-span-2">
        <Input
          aria-label="Precio hasta"
          inputMode="numeric"
          placeholder="Hasta"
          value={filters.maxPrice}
          onChange={(event) => set('maxPrice', digits(event.target.value))}
        />
      </FieldShell>

      <div className="col-span-2 flex items-end lg:col-span-3">
        <Button type="submit" className="h-10 w-full font-bold tracking-widest">
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
      <SelectTrigger aria-label={label}>
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
      <Label className="mb-1.5 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
