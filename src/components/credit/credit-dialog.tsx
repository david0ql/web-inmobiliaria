import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Path, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, submitCreditRequest } from '@/lib/api'
import { price } from '@/lib/format'
import { digits } from '@/lib/search-params'
import { cn } from '@/lib/utils'

/**
 * "Consulta de viabilidad": el formulario de credito hipotecario de `/creditos`.
 *
 * Son cerca de veinte campos, y en una sola pantalla nadie los termina —menos
 * aun en un movil. Va por pasos, con la barra de progreso arriba y validando
 * solo los campos del paso actual, para que el error salga donde el visitante
 * esta mirando y no al final de todo.
 *
 * El segundo solicitante no es un bloque escondido al pie: es un paso mas que
 * aparece cuando se activa, para que no parezca que el formulario se alarga
 * solo.
 *
 * OJO: esto NO consulta centrales de riesgo ni aprueba nada, y el texto de la
 * pantalla lo dice. Es un lead: recoge lo que la entidad va a pedir de todas
 * formas para que el asesor llame con el caso ya armado.
 */

// --- opciones --------------------------------------------------------------

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
] as const

const GENDERS = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'UNDISCLOSED', label: 'Prefiero no decirlo' },
] as const

const OCCUPATIONS = [
  { value: 'SALARIED', label: 'Asalariado' },
  { value: 'PENSIONER', label: 'Pensionado' },
  { value: 'SELF_EMPLOYED', label: 'Independiente' },
] as const

const PORTFOLIOS = [
  { value: 'VIS', label: 'VIS', hint: 'Vivienda de interés social' },
  { value: 'NON_VIS', label: 'No VIS', hint: 'Fuera del tope VIS' },
] as const

const HOUSING_TYPES = [
  { value: 'NEW', label: 'Nueva' },
  { value: 'USED', label: 'Usada' },
] as const

const PRODUCTS = [
  { value: 'MORTGAGE', label: 'Crédito hipotecario' },
  { value: 'HOUSING_LEASING', label: 'Leasing habitacional' },
] as const

const TERMS = [5, 10, 15, 20, 25, 30]

/** La edad maxima para tomar un credito hipotecario ronda los 75 años. */
const MAX_AGE = 75
const MIN_AGE = 18

const today = new Date()
const isoYearsAgo = (years: number) => {
  const date = new Date(today)
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

// --- esquema ---------------------------------------------------------------

const money = z
  .string()
  .trim()
  .refine((value) => Number(digits(value)) > 0, 'Escribe un valor.')

const birthDate = z
  .string()
  .min(1, 'Necesitamos tu fecha de nacimiento.')
  .refine((value) => value >= isoYearsAgo(MAX_AGE), {
    message: `La edad máxima para solicitar un crédito es de ${MAX_AGE} años.`,
  })
  .refine((value) => value <= isoYearsAgo(MIN_AGE), {
    message: 'Hay que ser mayor de edad.',
  })

const person = {
  firstName: z.string().trim().min(2, 'Escribe los nombres.'),
  lastName: z.string().trim().min(2, 'Escribe los apellidos.'),
  birthDate,
  phone: z.string().trim().min(7, 'Necesitamos un teléfono para llamarte.'),
  email: z.email('Ese correo no parece válido.'),
  documentType: z.enum(['CC', 'CE', 'PASSPORT', 'NIT']),
  documentNumber: z.string().trim().min(4, 'Escribe el número de documento.'),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED']).or(z.literal('')),
  occupation: z.enum(['SALARIED', 'PENSIONER', 'SELF_EMPLOYED']),
  monthlyIncome: z.string().trim().optional(),
}

const schema = z
  .object({
    ...person,

    withCoApplicant: z.boolean(),
    coFirstName: z.string().trim().optional(),
    coLastName: z.string().trim().optional(),
    coBirthDate: z.string().optional(),
    coPhone: z.string().trim().optional(),
    coEmail: z.string().trim().optional(),
    coDocumentType: z.enum(['CC', 'CE', 'PASSPORT', 'NIT']),
    coDocumentNumber: z.string().trim().optional(),
    coGender: z.enum(['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED']).or(z.literal('')),
    coOccupation: z.enum(['SALARIED', 'PENSIONER', 'SELF_EMPLOYED']),
    coMonthlyIncome: z.string().trim().optional(),

    portfolioType: z.enum(['VIS', 'NON_VIS']),
    housingType: z.enum(['NEW', 'USED']),
    product: z.enum(['MORTGAGE', 'HOUSING_LEASING']),
    termYears: z.string(),
    workCityName: z.string().trim().min(2, '¿En qué ciudad trabajas?'),
    amount: money,

    hasPropertyPicked: z.boolean(),
    propertyValue: z.string().trim().optional(),
    propertyCode: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    acceptedTerms: z.literal(true, {
      message: 'Hay que aceptar el tratamiento de datos para enviar.',
    }),
  })
  /*
   * Las reglas cruzadas van aqui y no en cada campo porque dependen de una
   * casilla que vive en otro paso. `superRefine` deja apuntar el error al campo
   * concreto, que es lo que hace que el paso correcto se abra al fallar.
   */
  .superRefine((values, ctx) => {
    if (values.hasPropertyPicked && !Number(digits(values.propertyValue ?? ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['propertyValue'],
        message: 'Si ya sabes cuál, dinos cuánto vale.',
      })
    }

    if (!values.withCoApplicant) return

    const required: [Path<CreditValues>, string | undefined, string][] = [
      ['coFirstName', values.coFirstName, 'Escribe los nombres.'],
      ['coLastName', values.coLastName, 'Escribe los apellidos.'],
      ['coPhone', values.coPhone, 'Necesitamos un teléfono.'],
      ['coDocumentNumber', values.coDocumentNumber, 'Escribe el documento.'],
    ]
    for (const [path, value, message] of required) {
      if (!value || value.trim().length < 2) {
        ctx.addIssue({ code: 'custom', path: [path], message })
      }
    }
    if (!values.coEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.coEmail)) {
      ctx.addIssue({
        code: 'custom',
        path: ['coEmail'],
        message: 'Ese correo no parece válido.',
      })
    }
    const parsed = birthDate.safeParse(values.coBirthDate ?? '')
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['coBirthDate'],
        message: parsed.error.issues[0]?.message ?? 'Revisa la fecha.',
      })
    }
  })

type CreditValues = z.infer<typeof schema>

type Form = UseFormReturn<CreditValues>

// --- pasos -----------------------------------------------------------------

interface Step {
  id: string
  title: string
  fields: Path<CreditValues>[]
}

const STEP_APPLICANT: Step = {
  id: 'applicant',
  title: 'Tus datos',
  fields: [
    'firstName',
    'lastName',
    'birthDate',
    'phone',
    'email',
    'documentType',
    'documentNumber',
    'gender',
    'occupation',
    'monthlyIncome',
  ],
}

const STEP_CO_APPLICANT: Step = {
  id: 'co-applicant',
  title: 'Segundo solicitante',
  fields: [
    'coFirstName',
    'coLastName',
    'coBirthDate',
    'coPhone',
    'coEmail',
    'coDocumentType',
    'coDocumentNumber',
    'coGender',
    'coOccupation',
    'coMonthlyIncome',
  ],
}

const STEP_CREDIT: Step = {
  id: 'credit',
  title: 'El crédito',
  fields: [
    'portfolioType',
    'housingType',
    'product',
    'termYears',
    'workCityName',
    'amount',
  ],
}

const STEP_PROPERTY: Step = {
  id: 'property',
  title: 'El inmueble',
  fields: ['hasPropertyPicked', 'propertyValue', 'propertyCode', 'notes', 'acceptedTerms'],
}

// --- componente ------------------------------------------------------------

export function CreditDialog({
  children,
  /** Lo usa CreditButton: cuando este modulo llega, el visitante ya ha pulsado. */
  defaultOpen = false,
  onOpenChange,
  /** Cuando se abre desde la ficha de un inmueble, llega ya rellenado. */
  propertyCode,
  propertyValue,
}: {
  children?: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  propertyCode?: string
  propertyValue?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [index, setIndex] = useState(0)

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    if (!next) setIndex(0)
  }

  const form = useForm<CreditValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      birthDate: '',
      phone: '',
      email: '',
      documentType: 'CC',
      documentNumber: '',
      gender: '',
      occupation: 'SALARIED',
      monthlyIncome: '',

      withCoApplicant: false,
      coFirstName: '',
      coLastName: '',
      coBirthDate: '',
      coPhone: '',
      coEmail: '',
      coDocumentType: 'CC',
      coDocumentNumber: '',
      coGender: '',
      coOccupation: 'SALARIED',
      coMonthlyIncome: '',

      portfolioType: 'NON_VIS',
      housingType: 'USED',
      product: 'MORTGAGE',
      termYears: '25',
      workCityName: '',
      amount: '',

      hasPropertyPicked: Boolean(propertyCode),
      propertyValue: propertyValue ? String(propertyValue) : '',
      propertyCode: propertyCode ?? '',
      notes: '',
      acceptedTerms: false as unknown as true,
    },
  })

  const withCoApplicant = form.watch('withCoApplicant')
  const steps = withCoApplicant
    ? [STEP_APPLICANT, STEP_CO_APPLICANT, STEP_CREDIT, STEP_PROPERTY]
    : [STEP_APPLICANT, STEP_CREDIT, STEP_PROPERTY]

  // Activar el segundo solicitante inserta un paso: sin esto el indice se
  // quedaria apuntando al paso equivocado.
  const current = Math.min(index, steps.length - 1)
  const step = steps[current]
  const last = current === steps.length - 1

  async function next() {
    if (!(await form.trigger(step.fields))) return
    setIndex(current + 1)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await submitCreditRequest(toPayload(values))
      toast.success(`Consulta ${result.reference} recibida`, {
        description: result.message,
      })
      form.reset()
      change(false)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos enviar la consulta. Revisa tu conexión e inténtalo otra vez.',
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        {children ?? <Button>Consulta de viabilidad</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consulta de viabilidad</DialogTitle>
          <DialogDescription>
            Cuéntanos tu caso y un asesor te explica qué opciones tienes y qué
            necesitas reunir. No consultamos centrales de riesgo ni esto aprueba
            ningún crédito.
          </DialogDescription>
        </DialogHeader>

        <Progress steps={steps} current={current} />

        <form
          onSubmit={(event) => {
            // Enter en cualquier campo enviaria el formulario desde el primer
            // paso: solo el ultimo paso envia de verdad.
            if (!last) {
              event.preventDefault()
              void next()
              return
            }
            void onSubmit(event)
          }}
        >
          {step.id === 'applicant' && <ApplicantStep form={form} />}
          {step.id === 'co-applicant' && <CoApplicantStep form={form} />}
          {step.id === 'credit' && <CreditStep form={form} />}
          {step.id === 'property' && <PropertyStep form={form} />}

          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIndex(current - 1)}
              className={cn(current === 0 && 'invisible')}
            >
              <ArrowLeft />
              Atrás
            </Button>

            <div className="flex items-center gap-3">
              <span className="tabular text-xs text-muted-foreground">
                Paso {current + 1} de {steps.length}
              </span>
              {last ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Enviar consulta
                </Button>
              ) : (
                <Button type="button" onClick={() => void next()}>
                  Continuar
                  <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** El payload que espera `POST /public/credit-requests`. */
function toPayload(values: CreditValues) {
  const number = (value: string | undefined) => {
    const clean = digits(value ?? '')
    return clean ? Number(clean) : undefined
  }

  return {
    firstName: values.firstName,
    lastName: values.lastName,
    birthDate: values.birthDate,
    phone: values.phone,
    email: values.email,
    documentType: values.documentType,
    documentNumber: values.documentNumber,
    gender: values.gender || undefined,
    occupation: values.occupation,
    monthlyIncome: number(values.monthlyIncome),

    portfolioType: values.portfolioType,
    housingType: values.housingType,
    product: values.product,
    termYears: Number(values.termYears),
    workCityName: values.workCityName,
    amount: number(values.amount),

    hasPropertyPicked: values.hasPropertyPicked,
    propertyValue: values.hasPropertyPicked
      ? number(values.propertyValue)
      : undefined,
    propertyCode: values.propertyCode || undefined,

    coApplicant: values.withCoApplicant
      ? {
          firstName: values.coFirstName,
          lastName: values.coLastName,
          birthDate: values.coBirthDate,
          phone: values.coPhone,
          email: values.coEmail,
          documentType: values.coDocumentType,
          documentNumber: values.coDocumentNumber,
          gender: values.coGender || undefined,
          occupation: values.coOccupation,
          monthlyIncome: number(values.coMonthlyIncome),
        }
      : undefined,

    notes: values.notes || undefined,
    acceptedTerms: values.acceptedTerms,
  }
}

// --- pasos -----------------------------------------------------------------

function ApplicantStep({ form }: { form: Form }) {
  return (
    <Fieldset legend="Cuéntanos de ti">
      <Field form={form} name="firstName" label="Nombres" autoComplete="given-name" />
      <Field form={form} name="lastName" label="Apellidos" autoComplete="family-name" />
      <Field
        form={form}
        name="birthDate"
        label="Fecha de nacimiento"
        type="date"
        min={isoYearsAgo(MAX_AGE)}
        max={isoYearsAgo(MIN_AGE)}
        hint={`La edad máxima para solicitar un crédito es de ${MAX_AGE} años.`}
      />
      <Field
        form={form}
        name="phone"
        label="Teléfono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
      />
      <Field
        form={form}
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        className="sm:col-span-2"
      />
      <SelectField
        form={form}
        name="documentType"
        label="Tipo de documento"
        options={DOCUMENT_TYPES}
      />
      <Field
        form={form}
        name="documentNumber"
        label="Número de documento"
        inputMode="numeric"
      />
      <SelectField
        form={form}
        name="gender"
        label="Género"
        options={GENDERS}
        placeholder="Prefiero no decirlo"
      />

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="occupation"
          label="Tipo de ocupación"
          options={OCCUPATIONS}
        />
      </div>
      <MoneyField
        form={form}
        name="monthlyIncome"
        label="Ingreso mensual (opcional)"
        hint="Ayuda al asesor a estimar cuánto puedes pagar de cuota."
      />

      <div className="sm:col-span-2">
        <Toggle
          form={form}
          name="withCoApplicant"
          label="Agregar segundo solicitante"
          hint="Sumar los ingresos de dos personas suele ampliar el monto al que se puede acceder."
        />
      </div>
    </Fieldset>
  )
}

function CoApplicantStep({ form }: { form: Form }) {
  return (
    <Fieldset legend="Datos del segundo solicitante">
      <Field form={form} name="coFirstName" label="Nombres" />
      <Field form={form} name="coLastName" label="Apellidos" />
      <Field
        form={form}
        name="coBirthDate"
        label="Fecha de nacimiento"
        type="date"
        min={isoYearsAgo(MAX_AGE)}
        max={isoYearsAgo(MIN_AGE)}
      />
      <Field form={form} name="coPhone" label="Teléfono" type="tel" inputMode="tel" />
      <Field
        form={form}
        name="coEmail"
        label="Correo electrónico"
        type="email"
        className="sm:col-span-2"
      />
      <SelectField
        form={form}
        name="coDocumentType"
        label="Tipo de documento"
        options={DOCUMENT_TYPES}
      />
      <Field
        form={form}
        name="coDocumentNumber"
        label="Número de documento"
        inputMode="numeric"
      />
      <SelectField
        form={form}
        name="coGender"
        label="Género"
        options={GENDERS}
        placeholder="Prefiero no decirlo"
      />
      <MoneyField
        form={form}
        name="coMonthlyIncome"
        label="Ingreso mensual (opcional)"
      />
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="coOccupation"
          label="Tipo de ocupación"
          options={OCCUPATIONS}
        />
      </div>
    </Fieldset>
  )
}

function CreditStep({ form }: { form: Form }) {
  return (
    <Fieldset legend="El crédito que necesitas">
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="portfolioType"
          label="Tipo de cartera"
          options={PORTFOLIOS}
        />
      </div>
      <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
        <Choice
          form={form}
          name="housingType"
          label="Tipo de vivienda"
          options={HOUSING_TYPES}
        />
        <Choice form={form} name="product" label="Tipo de producto" options={PRODUCTS} />
      </div>

      <SelectField
        form={form}
        name="termYears"
        label="Plazo"
        options={TERMS.map((years) => ({
          value: String(years),
          label: `${years} años`,
        }))}
      />
      <Field form={form} name="workCityName" label="Ciudad donde trabajas" />
      <MoneyField
        form={form}
        name="amount"
        label="Monto solicitado"
        className="sm:col-span-2"
      />
    </Fieldset>
  )
}

function PropertyStep({ form }: { form: Form }) {
  const picked = form.watch('hasPropertyPicked')

  return (
    <Fieldset legend="Hablemos del inmueble">
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="hasPropertyPicked"
          label="¿Ya sabes qué inmueble quieres comprar?"
          options={[
            { value: true, label: 'Sí' },
            { value: false, label: 'Todavía no' },
          ]}
        />
      </div>

      {picked && (
        <>
          <MoneyField form={form} name="propertyValue" label="Valor del inmueble" />
          <Field
            form={form}
            name="propertyCode"
            label="Código del inmueble (opcional)"
            placeholder="Ej. 100234"
            hint="Si lo viste en nuestra web, el código está en la ficha."
          />
        </>
      )}

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="credit-notes">Observaciones (opcional)</Label>
        <Textarea
          id="credit-notes"
          rows={3}
          placeholder="Lo que quieras contarnos de tu caso."
          {...form.register('notes')}
        />
      </div>

      <div className="sm:col-span-2">
        <Toggle
          form={form}
          name="acceptedTerms"
          label="Autorizo el tratamiento de mis datos personales"
          hint="Solo los usamos para estudiar tu caso y contactarte."
        />
      </div>
    </Fieldset>
  )
}

// --- piezas ----------------------------------------------------------------

function Progress({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex gap-2" aria-label="Progreso del formulario">
      {steps.map((step, i) => (
        <li key={step.id} className="flex-1">
          <div
            className={cn(
              'h-1 rounded-full transition-colors',
              i <= current ? 'bg-primary' : 'bg-secondary',
            )}
          />
          <span
            className={cn(
              'mt-1.5 block text-[11px] leading-tight',
              i === current
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {step.title}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Fieldset({
  legend,
  children,
}: {
  legend: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="mt-2">
      <legend className="mb-4 text-xs font-bold tracking-widest text-primary uppercase">
        {legend}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function ErrorText({ form, name }: { form: Form; name: Path<CreditValues> }) {
  const error = form.formState.errors[name]
  if (!error) return null
  return <p className="text-xs text-destructive">{error.message as string}</p>
}

function Field({
  form,
  name,
  label,
  hint,
  className,
  ...props
}: {
  form: Form
  name: Path<CreditValues>
  label: string
  hint?: string
  className?: string
} & Omit<React.ComponentProps<'input'>, 'form' | 'name'>) {
  const error = form.formState.errors[name]
  return (
    <div className={cn('grid gap-1.5 content-start', className)}>
      <Label htmlFor={`credit-${name}`}>{label}</Label>
      <Input
        id={`credit-${name}`}
        aria-invalid={error ? true : undefined}
        {...props}
        {...form.register(name)}
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <ErrorText form={form} name={name} />
    </div>
  )
}

/**
 * Miles con punto mientras se escribe. Un monto de nueve cifras sin separar es
 * ilegible, y es justo el campo donde equivocarse en un cero cambia la consulta
 * entera.
 */
function MoneyField({
  form,
  name,
  label,
  hint,
  className,
}: {
  form: Form
  name: Path<CreditValues>
  label: string
  hint?: string
  className?: string
}) {
  const error = form.formState.errors[name]
  const raw = digits(String(form.watch(name) ?? ''))

  return (
    <div className={cn('grid gap-1.5 content-start', className)}>
      <Label htmlFor={`credit-${name}`}>{label}</Label>
      <Input
        id={`credit-${name}`}
        inputMode="numeric"
        placeholder="$"
        aria-invalid={error ? true : undefined}
        value={raw ? price(Number(raw)) : ''}
        onChange={(event) =>
          form.setValue(name, digits(event.target.value) as never, {
            shouldValidate: form.formState.isSubmitted,
          })
        }
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <ErrorText form={form} name={name} />
    </div>
  )
}

function SelectField({
  form,
  name,
  label,
  options,
  placeholder,
  className,
}: {
  form: Form
  name: Path<CreditValues>
  label: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
  className?: string
}) {
  const error = form.formState.errors[name]
  return (
    <div className={cn('grid gap-1.5 content-start', className)}>
      <Label htmlFor={`credit-${name}`}>{label}</Label>
      {/*
        Un `select` nativo y no el de Radix: dentro de un modal con scroll el
        desplegable nativo es el que mejor se porta en movil, que es donde se
        va a llenar esto.
      */}
      <select
        id={`credit-${name}`}
        aria-invalid={error ? true : undefined}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 aria-invalid:border-destructive"
        {...form.register(name)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorText form={form} name={name} />
    </div>
  )
}

/** Botonera de una sola eleccion: mas rapida de tocar que un desplegable. */
function Choice<T extends string | boolean>({
  form,
  name,
  label,
  options,
}: {
  form: Form
  name: Path<CreditValues>
  label: string
  options: readonly { value: T; label: string; hint?: string }[]
}) {
  const value = form.watch(name)

  return (
    <div className="grid gap-1.5 content-start">
      <span className="text-sm font-medium">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                form.setValue(name, option.value as never, {
                  shouldValidate: form.formState.isSubmitted,
                })
              }
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                active
                  ? 'border-primary bg-primary/10 font-semibold'
                  : 'bg-background hover:bg-secondary',
              )}
            >
              {option.label}
              {option.hint && (
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <ErrorText form={form} name={name} />
    </div>
  )
}

function Toggle({
  form,
  name,
  label,
  hint,
}: {
  form: Form
  name: Path<CreditValues>
  label: string
  hint?: string
}) {
  return (
    <div className="grid gap-1.5">
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          {...form.register(name)}
        />
        <span>
          {label}
          {hint && (
            <span className="block text-xs text-muted-foreground">{hint}</span>
          )}
        </span>
      </label>
      <ErrorText form={form} name={name} />
    </div>
  )
}
