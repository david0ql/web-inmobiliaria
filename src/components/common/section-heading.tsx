import { cn } from '@/lib/utils'

/**
 * El rotulo de seccion del tema: la primera palabra fina, la segunda en negrita
 * y un cuadradito debajo (`.tt-sqr`). Es lo que separa "INMUEBLES" de
 * "DESTACADOS" en la home.
 */
export function SectionHeading({
  light,
  strong,
  as: Tag = 'h2',
  size = 'md',
  className,
}: {
  light: string
  strong?: string
  as?: 'h1' | 'h2' | 'h3'
  /** `sm` para los rotulos de la portada, que competian con el contenido. */
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cn(size === 'sm' ? 'mb-4' : 'mb-6', className)}>
      <Tag
        className={cn(
          'tt-square font-light tracking-wide uppercase',
          size === 'sm' ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl',
        )}
      >
        {light} {strong && <strong className="font-bold">{strong}</strong>}
      </Tag>
    </div>
  )
}
