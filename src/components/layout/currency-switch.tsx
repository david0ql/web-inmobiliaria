import { useCurrency, type Moneda } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const OPCIONES: { value: Moneda; label: string }[] = [
  { value: 'COP', label: 'COP' },
  { value: 'USD', label: 'USD' },
]

/**
 * El conmutador de moneda, en la barra de arriba.
 *
 * Ahí porque es una preferencia del sitio entero, como el idioma en cualquier
 * web: ponerlo dentro de una tarjeta obligaría a repetirlo en cada una y a
 * decidirlo otra vez en cada pantalla.
 *
 * No aparece si la API no supo el valor del dólar. Un conmutador que no cambia
 * nada, o que convierte con una cifra inventada, es peor que no tenerlo: aquí
 * se están enseñando precios de casas.
 */
export function CurrencySwitch({ className }: { className?: string }) {
  const { moneda, tasa, disponible, cambiar } = useCurrency()
  const t = useT()

  if (!disponible) return null

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      title={
        tasa
          ? t('switch.currency.rate', {
              rate: new Intl.NumberFormat('es-CO', {
                maximumFractionDigits: 2,
              }).format(tasa.rate),
              source: t(
                tasa.source === 'TRM'
                  ? 'switch.currency.source.trm'
                  : 'switch.currency.source.market',
              ),
              date: tasa.date,
            })
          : undefined
      }
    >
      <span className="sr-only" id="moneda-label">
        {t('switch.currency.aria')}
      </span>
      <div
        role="group"
        aria-labelledby="moneda-label"
        className="flex rounded-full bg-white/10 p-0.5"
      >
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            onClick={() => cambiar(opcion.value)}
            aria-pressed={moneda === opcion.value}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors',
              moneda === opcion.value
                ? 'bg-white text-[#0d0d0d]'
                : 'text-white/70 hover:text-white',
            )}
          >
            {opcion.label}
          </button>
        ))}
      </div>
    </div>
  )
}
