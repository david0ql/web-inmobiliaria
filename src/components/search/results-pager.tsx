import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * La paginacion numerada del tema, con su "» Siguiente". Se enseña una ventana
 * de cinco paginas alrededor de la actual: con 642 inmuebles y 24 por pagina
 * salen 27 numeros, que en un movil no caben.
 */
export function ResultsPager({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
}) {
  const t = useT()

  if (pages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const end = Math.min(pages, start + 4)
  const window = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <nav
      aria-label={t('search.pager.aria')}
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      {page > 1 && (
        <PagerButton onClick={() => onPage(page - 1)}>
          {t('search.pager.prev')}
        </PagerButton>
      )}

      {start > 1 && (
        <>
          <PagerButton onClick={() => onPage(1)}>1</PagerButton>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {window.map((number) => (
        <PagerButton
          key={number}
          current={number === page}
          onClick={() => onPage(number)}
        >
          {number}
        </PagerButton>
      ))}

      {end < pages && (
        <>
          {end < pages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <PagerButton onClick={() => onPage(pages)}>{pages}</PagerButton>
        </>
      )}

      {page < pages && (
        <PagerButton onClick={() => onPage(page + 1)}>
          {t('search.pager.next')}
        </PagerButton>
      )}
    </nav>
  )
}

function PagerButton({
  current,
  onClick,
  children,
}: {
  current?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'tabular h-9 min-w-9 rounded-md border px-3 text-sm transition-colors',
        current
          ? 'border-primary bg-primary font-semibold text-primary-foreground'
          : 'bg-background hover:bg-secondary',
      )}
    >
      {children}
    </button>
  )
}
