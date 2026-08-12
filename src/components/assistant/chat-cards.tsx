import { Bath, BedDouble, Car, CalendarCheck, Ruler } from 'lucide-react'
import { Link } from '@/lib/nav'

import type { AssistantCard, PropertyCardView } from '@/lib/assistant'
import { useCurrency } from '@/lib/currency'
import { area as fmtArea, diaDe, fechaFormat } from '@/lib/format'
import { useIdioma, useT, type Idioma } from '@/lib/i18n'

/**
 * Las tarjetas que el asistente inserta en la conversación.
 *
 * No las pinta el modelo: las manda el servidor con datos de la base, y aquí se
 * dibujan con el mismo lenguaje del sitio —negro sobre blanco, radios de 6px,
 * versalitas— para que el chat se sienta parte de la web y no un widget pegado.
 */
export function ChatCard({
  card,
  onNavigate,
}: {
  card: AssistantCard
  /** Cerrar el panel al abrir una ficha desde una tarjeta. */
  onNavigate?: () => void
}) {
  switch (card.type) {
    case 'properties':
      return (
        <div className="flex flex-col gap-2">
          {card.items.map((item) => (
            <PropertyRow key={item.code} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )
    case 'property':
      return <PropertyRow item={card.item} onNavigate={onNavigate} />
    case 'gallery':
      return <Gallery card={card} />
    case 'slots':
      return <Slots card={card} />
    case 'booked':
      return <Booked card={card} />
    default:
      return null
  }
}

/** Una tarjeta compacta de inmueble: foto, datos clave y precio. Enlaza a la ficha. */
function PropertyRow({
  item,
  onNavigate,
}: {
  item: PropertyCardView
  onNavigate?: () => void
}) {
  const t = useT()
  const { idioma } = useIdioma()
  const { precio, moneda } = useCurrency()
  const amount = item.salePrice ?? item.rentPrice

  /*
    El titulo, rehecho como en el resto del sitio: el guardado esta en español
    y lleva dentro el nombre del barrio, asi que no se traduce, se arma con sus
    piezas. Si falta el sitio se deja el guardado, que es mejor que nada.
  */
  const lugar = [item.zone, item.city].filter(Boolean).join(', ')
  const titulo =
    lugar && item.typeId
      ? t(item.forRent ? 'property.title.rent' : 'property.title.sale', {
          type: t(`catalog.propertyType.${item.typeId}`, undefined, item.type ?? ''),
          place: lugar,
        })
      : item.title
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className="group flex gap-3 overflow-hidden rounded-md border bg-card p-2 transition-colors hover:bg-secondary/60"
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-sm bg-secondary">
        {item.cover ? (
          <img
            src={item.cover}
            alt={titulo}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[0.625rem] text-muted-foreground">
            {t('property.photo.none')}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] leading-tight font-semibold uppercase">
            {titulo}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[item.zone, item.city].filter(Boolean).join(' · ') ||
              t('property.code', { code: item.code })}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[0.6875rem] text-muted-foreground">
          {item.area != null && (
            <Spec icon={Ruler} text={fmtArea(item.area, idioma)} />
          )}
          {item.bedrooms != null && <Spec icon={BedDouble} text={String(item.bedrooms)} />}
          {item.bathrooms != null && <Spec icon={Bath} text={String(item.bathrooms)} />}
          {item.garages != null && <Spec icon={Car} text={String(item.garages)} />}
        </div>
        <p className="tabular text-sm font-semibold">
          {precio(amount)}{' '}
          <span className="text-[0.625rem] font-normal tracking-widest text-muted-foreground uppercase">
            {moneda}
          </span>
        </p>
      </div>
    </Link>
  )
}

function Spec({ icon: Icon, text }: { icon: typeof Ruler; text: string }) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="tabular">{text}</span>
    </span>
  )
}

/** La galería, en una fila que se desliza. */
function Gallery({
  card,
}: {
  card: Extract<AssistantCard, { type: 'gallery' }>
}) {
  const t = useT()
  return (
    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
      {card.images.map((image, index) => (
        <a
          key={index}
          href={image.urlLarge}
          target="_blank"
          rel="noreferrer noopener"
          className="snap-start"
        >
          <img
            src={image.url}
            alt={
              image.description ??
              t('chat.gallery.photo.alt', {
                title: card.title,
                index: index + 1,
              })
            }
            loading="lazy"
            className="h-28 w-40 shrink-0 rounded-md border object-cover"
          />
        </a>
      ))}
    </div>
  )
}

/** El selector de horas: cada día con sus franjas. Solo lectura; el visitante
    le dice al asistente cuál quiere y este agenda. */
function Slots({ card }: { card: Extract<AssistantCard, { type: 'slots' }> }) {
  const { idioma } = useIdioma()
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      {card.days.map((day) => (
        <div key={day.date} className="flex flex-col gap-1.5">
          <p className="text-[0.6875rem] font-semibold tracking-wide uppercase">
            {longDate(day.date, idioma)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {day.slots.map((slot) => (
              <span
                key={slot.startsAt}
                className="tabular rounded-full border bg-secondary/60 px-2.5 py-1 text-xs"
              >
                {shortTime(slot.startsAt, idioma)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Confirmación de visita agendada. */
function Booked({ card }: { card: Extract<AssistantCard, { type: 'booked' }> }) {
  const t = useT()
  const { idioma } = useIdioma()
  return (
    <div className="flex items-center gap-3 rounded-md border border-tag-available/40 bg-tag-available/10 p-3">
      <CalendarCheck className="size-5 shrink-0 text-tag-available" />
      <div className="text-xs">
        <p className="font-semibold">{t('chat.visit.booked')}</p>
        <p className="text-muted-foreground">
          {longDate(card.startsAt.slice(0, 10), idioma)} ·{' '}
          {shortTime(card.startsAt, idioma)}
        </p>
      </div>
    </div>
  )
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
}
const SHORT_TIME: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
}

function longDate(value: string, idioma: Idioma): string {
  const [year] = value.split('-').map(Number)
  if (!year) return value
  return fechaFormat(idioma, LONG_DATE).format(diaDe(value))
}

/* La hora es la de la oficina: `fechaFormat` la fija en Bogotá. */
function shortTime(iso: string, idioma: Idioma): string {
  return fechaFormat(idioma, SHORT_TIME).format(new Date(iso))
}
