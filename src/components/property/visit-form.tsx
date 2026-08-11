import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api, bookVisit } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Slot {
  startsAt: string
  endsAt: string
  agents: number
}

interface DayAvailability {
  date: string
  weekday: number
  available: boolean
  slots: Slot[]
}

/* Los mensajes son claves: se traducen al pintarlos, dentro del componente. */
const schema = z.object({
  firstName: z.string().trim().min(2, 'property.visit.error.first_name'),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().min(7, 'property.visit.error.phone'),
  email: z.email('property.visit.error.email').or(z.literal('')),
  message: z.string().trim().optional(),
  startsAt: z.string().min(1, 'property.visit.error.starts_at'),
})

type VisitValues = z.infer<typeof schema>

/**
 * Agendar una visita, en dos pasos: primero cuándo, después quién.
 *
 * Antes empezaba pidiendo nombre, apellidos, teléfono y correo, y el día
 * quedaba al final en dos desplegables. Eso es pedirle los datos a alguien
 * antes de saber si hay un hueco que le sirva: si al llegar abajo resulta que
 * el único horario libre es el martes a las 8, ha rellenado cuatro campos para
 * nada. Al revés se decide primero lo que puede hacer fracasar la gestión.
 *
 * El calendario enseña el mes entero con los días que tienen hueco: un
 * desplegable de fechas obliga a abrirlo y recorrerlo para descubrir que el
 * jueves no hay nada, y un mes se lee de un vistazo.
 *
 * Todo en hora de Colombia y no en la del navegador: la agenda es de la oficina
 * de Bucaramanga, y una visita a las 10 tiene que decir 10 aquí y en Madrid.
 */
export function VisitForm({ property }: { property: Property }) {
  const t = useT()
  const [days, setDays] = useState<DayAvailability[]>([])
  const [date, setDate] = useState('')
  const [mes, setMes] = useState<string>(() => mesDe(hoy()))

  const form = useForm<VisitValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      message: '',
      startsAt: '',
    },
  })

  useEffect(() => {
    const controller = new AbortController()
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 21)

    api
      .get<DayAvailability[]>(
        `/public/properties/${encodeURIComponent(property.code)}/availability`,
        { from: isoDate(from), to: isoDate(to) },
        controller.signal,
      )
      .then((result) =>
        setDays(result.filter((day) => day.available && day.slots.length)),
      )
      .catch(() => {
        /* Sin agenda disponible el formulario sigue sirviendo: se avisa abajo. */
      })

    return () => controller.abort()
  }, [property.code])

  const libres = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  )
  const slots = libres.get(date)?.slots ?? []
  const startsAt = form.watch('startsAt')

  /*
    Entre qué meses se puede navegar. La ventana son tres semanas, así que son
    uno o dos: dejar pasar a diciembre para encontrarlo vacío no ayuda a nadie.
  */
  const meses = useMemo(() => {
    const unicos = [...new Set(days.map((day) => mesDe(day.date)))].sort()
    return unicos.length ? unicos : [mesDe(hoy())]
  }, [days])

  useEffect(() => {
    // Si el mes que se está mirando no tiene nada, se salta al primero que sí.
    if (meses.length && !meses.includes(mes)) setMes(meses[0])
  }, [meses, mes])

  /*
    Elegida la hora, el cursor salta al primer campo.

    Sin esto hay que buscarlo: el calendario se recoge, aparecen cinco campos
    de golpe y la columna se ha reordenado entera debajo del punto donde se
    acaba de pulsar. El foco lo trae a la vista y ademas deja escribir sin
    tocar el raton.
  */
  const primerCampo = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (startsAt) primerCampo.current?.focus({ preventScroll: false })
  }, [startsAt])

  const elegirDia = (value: string) => {
    setDate(value)
    form.setValue('startsAt', '', { shouldValidate: false })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await bookVisit({
        propertyId: property.id,
        startsAt: values.startsAt,
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        phone: values.phone,
        email: values.email || undefined,
        message: values.message || undefined,
      })
      toast.success(t('property.visit.toast.success'), {
        description: result.message,
      })
      form.reset()
      setDate('')
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t('property.visit.toast.error'),
      )
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CalendarCheck className="size-4" />
        {t('property.visit.title')}
      </p>

      {days.length === 0 ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {t('property.visit.no_slots')}
        </p>
      ) : startsAt ? (
        /*
          Elegido el hueco, el calendario se recoge en una línea: ya cumplió, y
          dejarlo abierto encima del formulario obliga a bajar la vista otra vez
          por algo que ya está decidido.
        */
        <button
          type="button"
          onClick={() => form.setValue('startsAt', '')}
          className="flex w-full items-center justify-between gap-3 rounded-lg border bg-secondary/50 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
        >
          <span className="min-w-0">
            <span className="block text-[0.625rem] tracking-widest text-muted-foreground uppercase">
              {t('property.visit.your_visit')}
            </span>
            {/* Sin `truncate`: en la columna del asesor son 280 px y "lunes,
                10 de agosto, 8:00 a.m." se cortaba en "lunes, 10 de ag…", que
                es justo esconder el dato que se quiere confirmar. */}
            <span className="block text-sm font-medium">{cuando(startsAt)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Pencil className="size-3.5" aria-hidden="true" />
            {t('property.visit.change')}
          </span>
        </button>
      ) : (
        <>
          <Calendario
            mes={mes}
            meses={meses}
            libres={libres}
            elegido={date}
            onMes={setMes}
            onDia={elegirDia}
          />

          {date && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t('property.visit.free_hours', { date: largo(date) })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() =>
                      form.setValue('startsAt', slot.startsAt, {
                        shouldValidate: true,
                      })
                    }
                    className="rounded-md border px-1 py-2 text-sm whitespace-nowrap transition-colors hover:border-foreground hover:bg-secondary"
                  >
                    {hora(slot.startsAt)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!date && (
            <p className="text-xs text-muted-foreground">
              {t('property.visit.pick_day')}
            </p>
          )}
        </>
      )}

      {/*
        Los datos solo cuando ya hay día y hora. Pedirlos antes es pedirlos sin
        saber todavía si la visita se puede hacer.
      */}
      {startsAt && (
        <>
          <Field
            form={form}
            name="firstName"
            label={t('property.visit.form.first_name')}
            innerRef={primerCampo}
          />
          <Field
            form={form}
            name="lastName"
            label={t('property.visit.form.last_name')}
          />
          <Field
            form={form}
            name="phone"
            label={t('property.visit.form.phone')}
            type="tel"
            inputMode="tel"
          />
          <Field
            form={form}
            name="email"
            label={t('property.visit.form.email')}
            type="email"
          />

          <div className="grid gap-1.5">
            <Label htmlFor="visit-message">
              {t('property.visit.form.message')}
            </Label>
            <Textarea
              id="visit-message"
              rows={3}
              placeholder={t('property.visit.form.message_placeholder', {
                code: property.code,
              })}
              {...form.register('message')}
            />
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {t('property.visit.submit')}
          </Button>
        </>
      )}
    </form>
  )
}

/* Las iniciales de la cabecera del calendario, de domingo a sabado. */
const DIAS = [
  'property.visit.weekday.sunday',
  'property.visit.weekday.monday',
  'property.visit.weekday.tuesday',
  'property.visit.weekday.wednesday',
  'property.visit.weekday.thursday',
  'property.visit.weekday.friday',
  'property.visit.weekday.saturday',
]

/**
 * El mes, con los días que tienen hueco encendidos.
 *
 * Los que no lo tienen no se ocultan: se dejan apagados y sin pulsar. Un
 * calendario al que le faltan días se lee como un calendario roto, y ver el mes
 * completo es lo que permite entender de un vistazo que solo se atiende de
 * lunes a sábado.
 */
function Calendario({
  mes,
  meses,
  libres,
  elegido,
  onMes,
  onDia,
}: {
  mes: string
  meses: string[]
  libres: Map<string, DayAvailability>
  elegido: string
  onMes: (mes: string) => void
  onDia: (date: string) => void
}) {
  const t = useT()
  const [year, month] = mes.split('-').map(Number)
  const primero = new Date(year, month - 1, 1)
  const dias = new Date(year, month, 0).getDate()
  const hueco = primero.getDay()

  const indice = meses.indexOf(mes)
  const anterior = indice > 0 ? meses[indice - 1] : null
  const siguiente = indice < meses.length - 1 ? meses[indice + 1] : null

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <Paso
          lado="left"
          hacia={anterior}
          onMes={onMes}
          etiqueta={t('property.visit.previous_month')}
        />
        {/* `capitalize` pondria "Agosto De 2026": solo la primera letra. */}
        <p className="text-sm font-medium first-letter:uppercase">
          {MES.format(primero)}
        </p>
        <Paso
          lado="right"
          hacia={siguiente}
          onMes={onMes}
          etiqueta={t('property.visit.next_month')}
        />
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS.map((clave, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="py-1 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase"
          >
            {t(clave)}
          </span>
        ))}

        {Array.from({ length: hueco }, (_, i) => (
          <span key={`hueco-${i}`} />
        ))}

        {Array.from({ length: dias }, (_, i) => {
          const dia = i + 1
          const value = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const libre = libres.has(value)
          const activo = value === elegido

          return (
            <button
              key={value}
              type="button"
              disabled={!libre}
              onClick={() => onDia(value)}
              aria-label={largo(value)}
              aria-current={activo ? 'date' : undefined}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
                activo && 'bg-primary font-semibold text-primary-foreground',
                !activo &&
                  libre &&
                  'font-medium hover:bg-secondary hover:ring-1 hover:ring-border',
                !libre && 'text-muted-foreground/40',
              )}
            >
              {dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Paso({
  lado,
  hacia,
  onMes,
  etiqueta,
}: {
  lado: 'left' | 'right'
  hacia: string | null
  onMes: (mes: string) => void
  etiqueta: string
}) {
  const Icon = lado === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      disabled={!hacia}
      onClick={() => hacia && onMes(hacia)}
      aria-label={etiqueta}
      className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-secondary disabled:opacity-30"
    >
      <Icon className="size-4" />
    </button>
  )
}

function Field({
  form,
  name,
  label,
  innerRef,
  ...props
}: {
  form: ReturnType<typeof useForm<VisitValues>>
  name: keyof VisitValues
  label: string
  innerRef?: React.MutableRefObject<HTMLInputElement | null>
  /* `form` es tambien un atributo nativo del input, asi que se descarta. */
} & Omit<React.ComponentProps<'input'>, 'form' | 'name'>) {
  const t = useT()
  const error = form.formState.errors[name]
  // `register` trae su propia `ref` y hay que conservarla: si se pisa, el
  // formulario deja de ver el campo.
  const { ref, ...registro } = form.register(name)
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`visit-${name}`}>{label}</Label>
      <Input
        id={`visit-${name}`}
        aria-invalid={error ? true : undefined}
        {...props}
        {...registro}
        ref={(node) => {
          ref(node)
          if (innerRef) innerRef.current = node
        }}
      />
      {error && (
        <p className="text-xs text-destructive">{t(error.message as string)}</p>
      )}
    </div>
  )
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function hoy(): string {
  return isoDate(new Date())
}

/** `2026-08-14` -> `2026-08`. */
function mesDe(date: string): string {
  return date.slice(0, 7)
}

/*
  La agenda es la de la oficina de Bucaramanga: las horas se pintan en GMT-5
  pase lo que pase con el reloj de quien mira.
*/
const COLOMBIA = 'America/Bogota'

const MES = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
})

const LARGO = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: COLOMBIA,
  hour: 'numeric',
  minute: '2-digit',
})

const CUANDO = new Intl.DateTimeFormat('es-CO', {
  timeZone: COLOMBIA,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** La fecha viene como `YYYY-MM-DD`; sin la hora, `new Date` la lee como UTC. */
function largo(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return LARGO.format(new Date(year, month - 1, day))
}

/*
  "08:00 a. m." con espacios finos partia el boton en dos lineas dentro de una
  columna de 70 px. Se compacta a "8:00 a.m.", que es como se escribe una hora
  en un cartel de horarios.
*/
function hora(iso: string): string {
  return HORA.format(new Date(iso))
    .replace(/\s?a\.\s?m\./i, ' a.m.')
    .replace(/\s?p\.\s?m\./i, ' p.m.')
    .replace(/^0/, '')
}

function cuando(iso: string): string {
  return CUANDO.format(new Date(iso))
    .replace(/\s?a\.\s?m\./i, ' a.m.')
    .replace(/\s?p\.\s?m\./i, ' p.m.')
}
