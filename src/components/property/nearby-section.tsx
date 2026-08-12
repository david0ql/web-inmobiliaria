import { LocateFixed, Loader2, MapPin } from 'lucide-react'

import { SectionHeading } from '@/components/common/section-heading'
import { PropertyCard } from '@/components/property/property-card'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { bandera, useUbicacion } from '@/lib/ubicacion'

/**
 * Los inmuebles que tienes cerca.
 *
 * Es la sección con más valor de la portada para quien ya está en la ciudad y
 * la menos útil para quien mira desde otro país, así que no se pinta hasta que
 * hay permiso: un bloque vacío pidiendo permiso, encima del inventario, es un
 * peaje para todos a cambio del interés de unos pocos.
 *
 * El botón para pedirlo vive aquí mismo, con lo que se gana escrito al lado.
 * Nadie concede su ubicación a cambio de nada.
 */
export function NearbySection() {
  const t = useT()
  const { estado, lugar, cercanos, pedir } = useUbicacion()

  if (estado === 'no-disponible') return null

  if (estado === 'concedida' && cercanos.length > 0) {
    return (
      <section className="container-site mb-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            size="sm"
            light={t('nearby.heading.light')}
            strong={t('nearby.heading.strong')}
            className="mb-0"
          />
          {lugar && (
            /*
              La bandera y el país: es la prueba de que la ubicación se usó
              para algo. Sin esto, alguien concede el permiso y no ve pasar
              nada, que es exactamente lo que enseña a no concederlo nunca más.
            */
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-lg leading-none" aria-hidden="true">
                {bandera(lugar.countryCode)}
              </span>
              {t('nearby.you_are_in', {
                place: [lugar.city, lugar.countryName].filter(Boolean).join(', '),
              })}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cercanos.map((property) => (
            <div key={property.id} className="flex flex-col">
              <PropertyCard property={property} />
              <p className="tabular mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" />
                {t('nearby.distance', { km: distancia(property.distanceKm) })}
              </p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="container-site mb-14">
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-secondary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <LocateFixed className="size-4 shrink-0" aria-hidden="true" />
            {t('nearby.cta.title')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {estado === 'denegada'
              ? t('nearby.denied.detail')
              : t('nearby.cta.detail')}
          </p>
        </div>

        <Button
          onClick={pedir}
          disabled={estado === 'preguntando'}
          className="shrink-0"
        >
          {estado === 'preguntando' && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {estado === 'denegada'
            ? t('nearby.denied.action')
            : t('nearby.cta.action')}
        </Button>
      </div>
    </section>
  )
}

/** Menos de un kilómetro se dice en metros: "0,4 km" no lo lee nadie. */
function distancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
