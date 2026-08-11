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
import { useT } from '@/lib/i18n'
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

/*
 * Las listas guardan la CLAVE de cada rotulo, no el rotulo: viven en el modulo
 * y ahi no hay contexto que traducir. Cada paso las resuelve con `traducir`
 * justo antes de pintarlas.
 */

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'form.doc.type.cc' },
  { value: 'CE', label: 'form.doc.type.ce' },
  { value: 'PASSPORT', label: 'form.doc.type.passport' },
  { value: 'NIT', label: 'form.doc.type.nit' },
] as const

const GENDERS = [
  { value: 'FEMALE', label: 'form.gender.female' },
  { value: 'MALE', label: 'form.gender.male' },
  { value: 'OTHER', label: 'form.gender.other' },
  { value: 'UNDISCLOSED', label: 'form.gender.undisclosed' },
] as const

const OCCUPATIONS = [
  { value: 'SALARIED', label: 'form.occupation.salaried' },
  { value: 'PENSIONER', label: 'form.occupation.pensioner' },
  { value: 'SELF_EMPLOYED', label: 'form.occupation.self_employed' },
] as const

const PORTFOLIOS = [
  {
    value: 'VIS',
    label: 'form.credit.portfolio.vis',
    hint: 'form.credit.portfolio.vis.hint',
  },
  {
    value: 'NON_VIS',
    label: 'form.credit.portfolio.nonvis',
    hint: 'form.credit.portfolio.nonvis.hint',
  },
] as const

const HOUSING_TYPES = [
  { value: 'NEW', label: 'form.credit.housing.new' },
  { value: 'USED', label: 'form.credit.housing.used' },
] as const

const PRODUCTS = [
  { value: 'MORTGAGE', label: 'form.credit.product.mortgage' },
  { value: 'HOUSING_LEASING', label: 'form.credit.product.leasing' },
] as const

type Traducir = ReturnType<typeof useT>

/** Resuelve los rotulos de una lista de opciones con claves. */
function traducir<V extends string | boolean>(
  t: Traducir,
  options: readonly { value: V; label: string; hint?: string }[],
) {
  return options.map((option) => ({
    value: option.value,
    label: t(option.label),
    hint: option.hint ? t(option.hint) : undefined,
  }))
}

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

/*
 * Los mensajes son CLAVES: el esquema se construye al cargar el modulo, donde
 * no hay hook que valga. `ErrorText` las traduce al pintarlas.
 *
 * OJO: el texto de 'form.error.age.max' lleva los 75 escritos, porque ahi no
 * hay forma de pasarle variables. Si cambia MAX_AGE, cambia la frase.
 */

const money = z
  .string()
  .trim()
  .refine((value) => Number(digits(value)) > 0, 'form.error.amount')

const birthDate = z
  .string()
  .min(1, 'form.error.birthdate.required')
  .refine((value) => value >= isoYearsAgo(MAX_AGE), {
    message: 'form.error.age.max',
  })
  .refine((value) => value <= isoYearsAgo(MIN_AGE), {
    message: 'form.error.age.min',
  })

const person = {
  firstName: z.string().trim().min(2, 'form.error.firstname'),
  lastName: z.string().trim().min(2, 'form.error.lastname'),
  birthDate,
  phone: z.string().trim().min(7, 'form.error.phone'),
  email: z.email('form.error.email'),
  documentType: z.enum(['CC', 'CE', 'PASSPORT', 'NIT']),
  documentNumber: z.string().trim().min(4, 'form.error.document'),
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
    workCityName: z.string().trim().min(2, 'form.credit.error.city'),
    amount: money,

    hasPropertyPicked: z.boolean(),
    propertyValue: z.string().trim().optional(),
    propertyCode: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    acceptedTerms: z.literal(true, {
      message: 'form.credit.error.terms',
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
        message: 'form.error.phone.mismatch',
      })
    }
    if (values.documentNumber.trim() !== values.documentNumberConfirm.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentNumberConfirm'],
        message: 'form.error.document.mismatch',
      })
    }

    if (values.hasPropertyPicked && !Number(digits(values.propertyValue ?? ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['propertyValue'],
        message: 'form.credit.error.propertyvalue',
      })
    }

    if (!values.withCoApplicant) return

    const required: [Path<CreditValues>, string | undefined, string][] = [
      ['coFirstName', values.coFirstName, 'form.error.firstname'],
      ['coLastName', values.coLastName, 'form.error.lastname'],
      ['coPhone', values.coPhone, 'form.error.phone.short'],
      ['coDocumentNumber', values.coDocumentNumber, 'form.error.document.short'],
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
        message: 'form.error.email',
      })
    }
    const parsed = birthDate.safeParse(values.coBirthDate ?? '')
    if (!parsed.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['coBirthDate'],
        message: parsed.error.issues[0]?.message ?? 'form.error.date',
      })
    }
  })

type CreditValues = z.infer<typeof schema>

type Form = UseFormReturn<CreditValues>

// --- pasos -----------------------------------------------------------------

const STEP_APPLICANT: Step<CreditValues> = {
  id: 'applicant',
  title: 'form.step.owner',
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
  title: 'form.credit.step.coapplicant',
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
  title: 'form.credit.step.credit',
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
  title: 'form.step.property',
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
  const t = useT()

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
      toast.success(t('form.credit.toast.success', { reference: result.reference }), {
        description: result.message,
      })
      form.reset()
      change(false)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t('form.credit.toast.error'),
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        {children ?? <Button>{t('form.credit.title')}</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('form.credit.title')}</DialogTitle>
          <DialogDescription>{t('form.credit.description')}</DialogDescription>
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
              {t('form.back')}
            </Button>

            <div className="flex items-center gap-3">
              <span className="tabular text-xs text-muted-foreground">
                {t('form.step.of', {
                  current: current + 1,
                  total: steps.length,
                })}
              </span>
              {last ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  {t('form.credit.submit')}
                </Button>
              ) : (
                <Button type="button" onClick={() => void next()}>
                  {t('form.continue')}
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
  const t = useT()

  return (
    <Fieldset legend={t('form.credit.legend.applicant')}>
      <Field
        form={form}
        name="firstName"
        label={t('form.field.firstname')}
        autoComplete="given-name"
      />
      <Field
        form={form}
        name="lastName"
        label={t('form.field.lastname')}
        autoComplete="family-name"
      />
      <Field
        form={form}
        name="birthDate"
        label={t('form.field.birthdate')}
        type="date"
        min={isoYearsAgo(MAX_AGE)}
        max={isoYearsAgo(MIN_AGE)}
        hint={t('form.error.age.max')}
      />
      <Field
        form={form}
        name="phone"
        label={t('form.field.phone')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
      />
      <Field
        form={form}
        name="phoneConfirm"
        label={t('form.field.phone.confirm')}
        type="tel"
        inputMode="tel"
        // Pegar el primero anula la comprobacion: hay que volver a teclearlo.
        onPaste={(event) => event.preventDefault()}
      />
      <Field
        form={form}
        name="email"
        label={t('form.field.email')}
        type="email"
        autoComplete="email"
        className="sm:col-span-2"
      />
      <SelectField
        form={form}
        name="documentType"
        label={t('form.field.documenttype')}
        options={traducir(t, DOCUMENT_TYPES)}
      />
      <Field
        form={form}
        name="documentNumber"
        label={t('form.field.documentnumber')}
        inputMode="numeric"
      />
      <Field
        form={form}
        name="documentNumberConfirm"
        label={t('form.field.document.confirm')}
        inputMode="numeric"
        onPaste={(event) => event.preventDefault()}
      />
      <SelectField
        form={form}
        name="gender"
        label={t('form.field.gender')}
        options={traducir(t, GENDERS)}
        placeholder={t('form.gender.undisclosed')}
      />

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="occupation"
          label={t('form.field.occupation')}
          options={traducir(t, OCCUPATIONS)}
        />
      </div>
      <MoneyField
        form={form}
        name="monthlyIncome"
        label={t('form.field.income')}
        hint={t('form.credit.income.hint')}
      />

      <div className="sm:col-span-2">
        <Toggle
          form={form}
          name="withCoApplicant"
          label={t('form.credit.coapplicant.toggle')}
          hint={t('form.credit.coapplicant.hint')}
        />
      </div>
    </Fieldset>
  )
}

function CoApplicantStep({ form }: { form: Form }) {
  const t = useT()

  return (
    <Fieldset legend={t('form.credit.legend.coapplicant')}>
      <Field form={form} name="coFirstName" label={t('form.field.firstname')} />
      <Field form={form} name="coLastName" label={t('form.field.lastname')} />
      <Field
        form={form}
        name="coBirthDate"
        label={t('form.field.birthdate')}
        type="date"
        min={isoYearsAgo(MAX_AGE)}
        max={isoYearsAgo(MIN_AGE)}
      />
      <Field
        form={form}
        name="coPhone"
        label={t('form.field.phone')}
        type="tel"
        inputMode="tel"
      />
      <Field
        form={form}
        name="coEmail"
        label={t('form.field.email')}
        type="email"
        className="sm:col-span-2"
      />
      <SelectField
        form={form}
        name="coDocumentType"
        label={t('form.field.documenttype')}
        options={traducir(t, DOCUMENT_TYPES)}
      />
      <Field
        form={form}
        name="coDocumentNumber"
        label={t('form.field.documentnumber')}
        inputMode="numeric"
      />
      <SelectField
        form={form}
        name="coGender"
        label={t('form.field.gender')}
        options={traducir(t, GENDERS)}
        placeholder={t('form.gender.undisclosed')}
      />
      <MoneyField
        form={form}
        name="coMonthlyIncome"
        label={t('form.field.income')}
      />
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="coOccupation"
          label={t('form.field.occupation')}
          options={traducir(t, OCCUPATIONS)}
        />
      </div>
    </Fieldset>
  )
}

function CreditStep({ form }: { form: Form }) {
  const t = useT()

  return (
    <Fieldset legend={t('form.credit.legend.credit')}>
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="portfolioType"
          label={t('form.credit.field.portfolio')}
          options={traducir(t, PORTFOLIOS)}
        />
      </div>
      <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
        <Choice
          form={form}
          name="housingType"
          label={t('form.credit.field.housing')}
          options={traducir(t, HOUSING_TYPES)}
        />
        <Choice
          form={form}
          name="product"
          label={t('form.credit.field.product')}
          options={traducir(t, PRODUCTS)}
        />
      </div>

      <SelectField
        form={form}
        name="termYears"
        label={t('form.credit.field.term')}
        options={TERMS.map((years) => ({
          value: String(years),
          label: t('form.credit.term.years', { years }),
        }))}
      />
      <Field
        form={form}
        name="workCityName"
        label={t('form.credit.field.workcity')}
      />
      <MoneyField
        form={form}
        name="amount"
        label={t('form.credit.field.amount')}
        className="sm:col-span-2"
      />
    </Fieldset>
  )
}

function PropertyStep({ form }: { form: Form }) {
  // Hijo del formulario: `form.watch` no le re-pintaria. Ver fields.tsx.
  const picked = useWatch({ control: form.control, name: 'hasPropertyPicked' })
  const t = useT()

  return (
    <Fieldset legend={t('form.credit.legend.property')}>
      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="hasPropertyPicked"
          label={t('form.credit.field.picked')}
          options={[
            { value: true, label: t('form.yes') },
            { value: false, label: t('form.credit.picked.no') },
          ]}
        />
      </div>

      {picked && (
        <>
          <MoneyField
            form={form}
            name="propertyValue"
            label={t('form.credit.field.propertyvalue')}
          />
          <Field
            form={form}
            name="propertyCode"
            label={t('form.credit.field.propertycode')}
            placeholder={t('form.credit.propertycode.placeholder')}
            hint={t('form.credit.propertycode.hint')}
          />
        </>
      )}

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="credit-notes">{t('form.field.notes')}</Label>
        <Textarea
          id="credit-notes"
          rows={3}
          placeholder={t('form.credit.notes.placeholder')}
          {...form.register('notes')}
        />
      </div>

      <div className="sm:col-span-2">
        <Toggle
          form={form}
          name="acceptedTerms"
          label={t('form.credit.terms')}
          hint={t('form.credit.terms.hint')}
        />
      </div>
    </Fieldset>
  )
}
