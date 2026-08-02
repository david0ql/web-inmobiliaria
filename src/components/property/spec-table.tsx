import {
  area as fmtArea,
  businessType,
  CONDITION_LABEL,
  money,
  number,
} from '@/lib/format'
import type { Property } from '@/lib/types'

/**
 * "Detalles del inmueble", con las mismas filas y en el mismo orden que la ficha
 * actual. Las filas sin dato no se pintan: en el sitio anterior salian vacias y
 * solo hacian ruido.
 *
 * El pais no viaja en el payload (la region solo trae `countryId`), pero todo el
 * inventario de la agencia esta en Colombia.
 */
export function SpecTable({ property }: { property: Property }) {
  const rows: [string, string | null][] = [
    ['País', 'Colombia'],
    ['Departamento', property.city?.region?.name ?? null],
    ['Ciudad', property.city?.name ?? null],
    ['Zona / barrio', property.zone?.name ?? null],
    ['Código', property.code],
    ['Estado', property.condition ? CONDITION_LABEL[property.condition] : null],
    ['Área construida', property.builtArea ? fmtArea(property.builtArea) : null],
    ['Área terreno', property.area ? fmtArea(property.area) : null],
    ['Área privada', property.privateArea ? fmtArea(property.privateArea) : null],
    ['Alcobas', property.bedrooms ? number(property.bedrooms) : null],
    ['Baños', property.bathrooms ? number(property.bathrooms) : null],
    ['Garaje', property.garages ? number(property.garages) : null],
    ['Estrato', property.stratum ? number(property.stratum) : null],
    ['Pisos', property.floor ? number(property.floor) : null],
    ['Año construcción', property.buildingYear ? String(property.buildingYear) : null],
    ['Tipo de inmueble', property.propertyType?.name ?? null],
    ['Tipo de negocio', businessType(property)],
    [
      'Valor administración',
      property.maintenanceFee ? money(property.maintenanceFee) : null,
    ],
  ]

  const visible = rows.filter(([, value]) => value !== null && value !== '—')

  return (
    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      {visible.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b py-2.5 text-sm"
        >
          <dt className="text-muted-foreground">{label}:</dt>
          <dd className="tabular text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
