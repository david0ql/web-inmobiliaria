import { Languages } from 'lucide-react'
import { useId } from 'react'

import { IDIOMAS, useIdioma, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * El conmutador de idioma, junto al de moneda.
 *
 * Los dos son lo mismo: una preferencia de lectura que vale para el sitio
 * entero, así que viven en el mismo sitio y se ven igual. En móvil se queda
 * solo la etiqueta —ES / EN—, que es lo que se pulsa.
 */
export function LanguageSwitch({
  className,
  /*
    Sobre que fondo se pinta. La barra negra pide blancos; el menu movil es una
    hoja clara, y ahi el mismo blanco sobre blanco no se veia: el conmutador
    estaba, se podia pulsar, y no habia forma de leer cual de los dos idiomas
    estaba activo.
  */
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  const { idioma, cambiar } = useIdioma()
  const t = useT()
  /*
    El id se genera por instancia. Ahora hay dos conmutadores en el arbol —el de
    la barra negra, oculto por CSS en movil pero presente, y el del menu
    hamburguesa—, y con un id fijo los dos declaraban el mismo `idioma-label`:
    un lector de pantalla resuelve el duplicado por el primero que encuentra, o
    sea el que esta oculto.
  */
  const labelId = useId()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Languages className="hidden size-3.5 opacity-70 sm:block" aria-hidden="true" />
      <span className="sr-only" id={labelId}>
        {t('switch.language.aria')}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className={cn(
          'flex rounded-full p-0.5',
          tone === 'dark' ? 'bg-white/10' : 'bg-secondary',
        )}
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
                ? tone === 'dark'
                  ? 'bg-white text-[#0d0d0d]'
                  : 'bg-foreground text-background'
                : tone === 'dark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
