import { CalendarCheck, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api, bookVisit } from '@/lib/api'
import type { Property } from '@/lib/types'

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

const schema = z.object({
  firstName: z.string().trim().min(2, 'Escribe tu nombre.'),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().min(7, 'Necesitamos un teléfono para confirmarte.'),
  email: z.email('Ese correo no parece válido.').or(z.literal('')),
  message: z.string().trim().optional(),
  startsAt: z.string().min(1, 'Elige día y hora.'),
})

type VisitValues = z.infer<typeof schema>

/**
 * El formulario de la ficha. En el sitio anterior era un "escríbenos" que caia
 * en un correo; aqui agenda de verdad contra la agenda del equipo, leyendo los
 * huecos libres de `/public/properties/:code/availability`.
 *
 * La API exige el UUID del inmueble aunque las URLs vayan por `code`; viene en
 * el mismo payload, asi que no hay que pedirlo aparte.
 */
export function VisitForm({ property }: { property: Property }) {
  const [days, setDays] = useState<DayAvailability[]>([])
  const [date, setDate] = useState('')

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
      .then((result) => setDays(result.filter((day) => day.available && day.slots.length)))
      .catch(() => {
        /* Sin agenda disponible el formulario sigue sirviendo: se avisa abajo. */
      })

    return () => controller.abort()
  }, [property.code])

  const slots = days.find((day) => day.date === date)?.slots ?? []

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
      toast.success('Visita agendada', { description: result.message })
      form.reset()
      setDate('')
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos agendar la visita. Inténtalo de nuevo en un momento.',
      )
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CalendarCheck className="size-4" />
        Agenda una visita
      </p>

      <Field form={form} name="firstName" label="Nombres" />
      <Field form={form} name="lastName" label="Apellidos (opcional)" />
      <Field form={form} name="phone" label="Teléfono" type="tel" inputMode="tel" />
      <Field form={form} name="email" label="Correo (opcional)" type="email" />

      {days.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="visit-date">Día</Label>
            <Select
              value={date}
              onValueChange={(value) => {
                setDate(value)
                form.setValue('startsAt', '')
              }}
            >
              <SelectTrigger id="visit-date">
                <SelectValue placeholder="Elige" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day.date} value={day.date}>
                    {longDate(day.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="visit-slot">Hora</Label>
            <Select
              value={form.watch('startsAt')}
              onValueChange={(value) =>
                form.setValue('startsAt', value, { shouldValidate: true })
              }
              disabled={!date}
            >
              <SelectTrigger id="visit-slot">
                <SelectValue placeholder={date ? 'Elige' : '—'} />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.startsAt} value={slot.startsAt}>
                    {shortTime(slot.startsAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.formState.errors.startsAt && (
            <p className="col-span-2 text-xs text-destructive">
              {form.formState.errors.startsAt.message}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
          No hay horarios publicados ahora mismo. Llámanos y lo cuadramos.
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="visit-message">Mensaje (opcional)</Label>
        <Textarea
          id="visit-message"
          rows={3}
          placeholder={`Me interesa el inmueble ${property.code}.`}
          {...form.register('message')}
        />
      </div>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting || days.length === 0}
      >
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        Solicitar visita
      </Button>
    </form>
  )
}

function Field({
  form,
  name,
  label,
  ...props
}: {
  form: ReturnType<typeof useForm<VisitValues>>
  name: keyof VisitValues
  label: string
  /* `form` es tambien un atributo nativo del input, asi que se descarta. */
} & Omit<React.ComponentProps<'input'>, 'form' | 'name'>) {
  const error = form.formState.errors[name]
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`visit-${name}`}>{label}</Label>
      <Input
        id={`visit-${name}`}
        aria-invalid={error ? true : undefined}
        {...props}
        {...form.register(name)}
      />
      {error && <p className="text-xs text-destructive">{error.message as string}</p>}
    </div>
  )
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

const SHORT_TIME = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
})

/** La fecha viene como `YYYY-MM-DD`; sin la hora, `new Date` la lee como UTC. */
function longDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return LONG_DATE.format(new Date(year, month - 1, day))
}

function shortTime(iso: string): string {
  return SHORT_TIME.format(new Date(iso))
}
