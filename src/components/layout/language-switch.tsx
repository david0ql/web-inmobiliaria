import { Languages } from 'lucide-react'

import { IDIOMAS, useIdioma, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * El conmutador de idioma, junto al de moneda.
 *
 * Los dos son lo mismo: una preferencia de lectura que vale para el sitio
 * entero, así que viven en el mismo sitio y se ven igual. En móvil se queda
 * solo la etiqueta —ES / EN—, que es lo que se pulsa.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { idioma, cambiar } = useIdioma()
  const t = useT()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Languages className="hidden size-3.5 opacity-70 sm:block" aria-hidden="true" />
      <span className="sr-only" id="idioma-label">
        {t('switch.language.aria')}
      </span>
      <div
        role="group"
        aria-labelledby="idioma-label"
        className="flex rounded-full bg-white/10 p-0.5"
      >
        {IDIOMAS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => cambiar(value)}
            aria-pressed={idioma === value}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase transition-colors',
              idioma === value
                ? 'bg-white text-[#0d0d0d]'
                : 'text-white/70 hover:text-white',
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
