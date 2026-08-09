import { Bath, BedDouble, Car, ChevronLeft, ChevronRight, Ruler } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { area as fmtArea, price } from '@/lib/format'
import { propertyPath } from '@/lib/slug'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Las unidades del proyecto: se elige una y se ve.
 *
 * Antes eran tarjetas, y diez tarjetas con la misma foto aerea y el mismo
 * titulo —"LOTE EN VENTA EN RUITOQUE RESORT" diez veces— parecian diez
 * inmuebles sueltos en vez de diez lotes del mismo sitio. Luego fue una tabla,
 * que comparaba bien pero no enseñaba nada: quien mira un proyecto quiere ver
 * la unidad, no leer sus medidas.
 *
 * Asi que se elige del desplegable —donde cada opcion ya dice metros y precio,
 * que es por lo que se elige— y la unidad se abre entera: sus fotos, sus
 * cifras y sus dos botones. Se cambia de unidad sin salir de la pagina ni
 * perder el sitio.
 */
export function UnitPicker({ properties }: { properties: Property[] }) {
  const [selectedId, setSelectedId] = useState(properties[0]?.id ?? '')
  const [photo, setPhoto] = useState(0)

  const selected = useMemo(
    () => properties.find((p) => p.id === selectedId) ?? properties[0],
    [properties, selectedId],
  )

  if (!selected) return null

  const images = selected.images ?? []
  const actual = images[Math.min(photo, Math.max(images.length - 1, 0))]
  const built = selected.builtArea ?? selected.area

  const elegir = (id: string) => {
    setSelectedId(id)
    // La foto vuelve a la primera: seguir en la cuarta de la unidad anterior
    // enseñaria una habitacion de otro apartamento.
    setPhoto(0)
  }

  const mover = (paso: number) =>
    setPhoto((actual) => (actual + paso + images.length) % images.length)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-lg border bg-secondary">
          {actual ? (
            <img
              src={actual.urlMedium ?? actual.urlLarge}
              alt={`${selected.propertyType?.name ?? 'Unidad'} ${selected.code}`}
              loading="lazy"
              className="h-[260px] w-full object-cover sm:h-[340px]"
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground sm:h-[340px]">
              Esta unidad todavía no tiene fotos
            </div>
          )}

          {images.length > 1 && (
            <>
              <Flecha lado="left" onClick={() => mover(-1)} />
              <Flecha lado="right" onClick={() => mover(1)} />
              <span className="tabular absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                {(photo % images.length) + 1} / {images.length}
              </span>
            </>
          )}
        </div>

        {/* Las miniaturas solo donde caben: en movil se pasa con las flechas y
            una fila de recortes de 60 px no ayuda a nadie. */}
        {images.length > 1 && (
          <div className="mt-2 hidden gap-2 overflow-x-auto sm:flex">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setPhoto(index)}
                aria-label={`Foto ${index + 1}`}
                aria-current={index === photo % images.length}
                className={cn(
                  'size-16 shrink-0 overflow-hidden rounded-md border transition-opacity',
                  index === photo % images.length
                    ? 'border-foreground'
                    : 'opacity-60 hover:opacity-100',
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <label className="micro-label mb-1.5 block text-xs text-muted-foreground">
          Elige una unidad
        </label>
        <Select value={selected.id} onValueChange={elegir}>
          <SelectTrigger aria-label="Unidad del proyecto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {etiqueta(property)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="mt-5 tabular text-2xl leading-none font-normal tracking-tight">
          {selected.salePrice ? price(selected.salePrice) : 'Precio a consultar'}
        </p>
        <p className="tabular mt-1.5 text-xs text-muted-foreground">
          Código {selected.code}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-y py-4 text-sm sm:grid-cols-4">
          <Dato icon={Ruler} label="Área" valor={built ? fmtArea(built) : null} />
          <Dato icon={BedDouble} label="Alcobas" valor={selected.bedrooms} />
          <Dato icon={Bath} label="Baños" valor={selected.bathrooms} />
          <Dato icon={Car} label="Garajes" valor={selected.garages} />
        </dl>

        {selected.zone?.name && (
          <p className="mt-4 text-sm text-muted-foreground">
            {[selected.zone.name, selected.city?.name].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button asChild>
            <Link to={propertyPath(selected)}>Ver esta unidad</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`${propertyPath(selected)}#agendar`}>Agendar visita</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Lo que se lee en el desplegable: por lo que se elige una unidad. */
function etiqueta(property: Property): string {
  const built = property.builtArea ?? property.area
  return [
    property.propertyType?.name,
    built ? fmtArea(built) : null,
    property.salePrice ? price(property.salePrice) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function Dato({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof Ruler
  label: string
  valor: string | number | null | undefined
}) {
  // Sin dato no se pinta la casilla: un lote no tiene alcobas, y una fila de
  // guiones solo ocupa sitio.
  if (!valor) return null
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="tabular mt-1 truncate font-medium">{valor}</dd>
    </div>
  )
}

function Flecha({
  lado,
  onClick,
}: {
  lado: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = lado === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === 'left' ? 'Foto anterior' : 'Foto siguiente'}
      className={cn(
        'absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-md transition-opacity hover:bg-background',
        lado === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
