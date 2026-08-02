import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch, type Path, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  Choice,
  Field,
  Fieldset,
  MoneyField,
  Progress,
  SelectField,
  Toggle,
  type Step,
} from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, submitCreditRequest } from '@/lib/api'
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

    /*
     * Repetir telefono y documento no viaja a la API: es una comprobacion del
     * navegador contra el error de tecleo. Un digito de mas en el movil deja la
     * consulta sin forma de contestarla.
     */
    phoneConfirm: z.string().trim(),
    documentNumberConfirm: z.string().trim(),

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
    if (digits(values.phone) !== digits(values.phoneConfirm)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phoneConfirm'],
        message: 'Los teléfonos no coinciden.',
      })
    }
    if (values.documentNumber.trim() !== values.documentNumberConfirm.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentNumberConfirm'],
        message: 'Los documentos no coinciden.',
      })
    }

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

const STEP_APPLICANT: Step<CreditValues> = {
  id: 'applicant',
  title: 'Tus datos',
  fields: [
    'firstName',
    'lastName',
    'birthDate',
    'phone',
    'phoneConfirm',
    'email',
    'documentType',
    'documentNumber',
    'documentNumberConfirm',
    'gender',
    'occupation',
    'monthlyIncome',
  ],
}

const STEP_CO_APPLICANT: Step<CreditValues> = {
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

const STEP_CREDIT: Step<CreditValues> = {
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

const STEP_PROPERTY: Step<CreditValues> = {
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
      phoneConfirm: '',
      documentNumberConfirm: '',

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


/**
 * Avanza si el paso valida. Si no, enfoca el primer campo en falta: sin esto,
 * pulsar "Continuar" con un error mas abajo no hace nada visible y parece que
 * el boton esta roto.
 */
  async function next() {
    if (!(await form.trigger(step.fields))) {
      const failed = step.fields.find(
        (field) => form.getFieldState(field).invalid,
      )
      // Los botones y los montos no registran un `<input>`, asi que no hay
      // nada que enfocar: ahi basta con que el mensaje ya este pintado.
      if (failed) {
        try {
          form.setFocus(failed, { shouldSelect: true })
        } catch {
          /* campo sin ref */
        }
      }
      return
    }
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
        name="phoneConfirm"
        label="Confirma el teléfono"
        type="tel"
        inputMode="tel"
        // Pegar el primero anula la comprobacion: hay que volver a teclearlo.
        onPaste={(event) => event.preventDefault()}
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
      <Field
        form={form}
        name="documentNumberConfirm"
        label="Confirma el documento"
        inputMode="numeric"
        onPaste={(event) => event.preventDefault()}
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
  // Hijo del formulario: `form.watch` no le re-pintaria. Ver fields.tsx.
  const picked = useWatch({ control: form.control, name: 'hasPropertyPicked' })

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
