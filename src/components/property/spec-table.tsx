import {
  area as fmtArea,
  businessType,
  CONDITION_LABEL,
  money,
  number,
  stratumShort,
} from '@/lib/format'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useT } from '@/lib/i18n'
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
  const t = useT()
  const { tipo } = useCatalogo()

  // Cuatro booleanos que pueden darse a la vez: se nombran y se unen.
  const negocio = businessType(property, t)

  const rows: [string, string | null][] = [
    [t('property.spec.country'), t('property.spec.country.colombia')],
    [t('property.spec.region'), property.city?.region?.name ?? null],
    [t('property.spec.city'), property.city?.name ?? null],
    [t('property.spec.zone'), property.zone?.name ?? null],
    [t('property.spec.code'), property.code],
    [
      t('property.spec.condition'),
      property.condition && CONDITION_LABEL[property.condition]
        ? t(CONDITION_LABEL[property.condition])
        : null,
    ],
    [
      t('property.spec.built_area'),
      property.builtArea ? fmtArea(property.builtArea) : null,
    ],
    [t('property.spec.lot_area'), property.area ? fmtArea(property.area) : null],
    [
      t('property.spec.private_area'),
      property.privateArea ? fmtArea(property.privateArea) : null,
    ],
    [
      t('property.spec.bedrooms'),
      property.bedrooms ? number(property.bedrooms) : null,
    ],
    [
      t('property.spec.bathrooms'),
      property.bathrooms ? number(property.bathrooms) : null,
    ],
    [
      t('property.spec.garages'),
      property.garages ? number(property.garages) : null,
    ],
    // 7 y 8 no son estratos: son las categorias que WASI metia en el mismo
    // campo. Se dicen por su nombre.
    [
      t('property.spec.stratum'),
      property.stratum ? stratumShort(property.stratum, t) : null,
    ],
    [t('property.spec.floors'), property.floor ? number(property.floor) : null],
    [
      t('property.spec.building_year'),
      property.buildingYear ? String(property.buildingYear) : null,
    ],
    [t('property.spec.property_type'), tipo(property.propertyType)],
    [t('property.spec.business_type'), negocio],
    [
      t('property.spec.maintenance_fee'),
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
