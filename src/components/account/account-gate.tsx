import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { SectionHeading } from '@/components/common/section-heading'
import { Field, Fieldset, Toggle } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { mensajeDeError } from '@/lib/api-error'
import { useIdioma, useT } from '@/lib/i18n'
import { login, register } from '@/lib/portal'
import { cn } from '@/lib/utils'

/** La misma longitud que exige la API: doce. */
const MIN_PASSWORD = 12

/*
  Los mensajes de validación se traducen, y `useT` solo vive dentro de un
  componente: por eso los esquemas se construyen con `t` ya resuelto, en vez de
  ser constantes de módulo.
*/
type T = ReturnType<typeof useT>

const crearLoginSchema = (t: T) =>
  z.object({
    email: z.email(t('errors.email')),
    password: z.string().min(1, t('errors.password.required')),
  })

const crearRegisterSchema = (t: T) =>
  z
    .object({
      firstName: z.string().trim().min(2, t('errors.firstName')),
      lastName: z.string().trim().min(2, t('errors.lastName')),
      email: z.email(t('errors.email')),
      cellPhone: z.string().trim().min(7, t('errors.phone')),
      identification: z.string().trim().optional(),
      password: z
        .string()
        .min(MIN_PASSWORD, t('errors.password.min', { min: MIN_PASSWORD })),
      passwordConfirm: z.string(),
      acceptsMarketing: z.boolean(),
    })
    .refine((values) => values.password === values.passwordConfirm, {
      path: ['passwordConfirm'],
      message: t('errors.password.mismatch'),
    })

type LoginValues = z.infer<ReturnType<typeof crearLoginSchema>>
type RegisterValues = z.infer<ReturnType<typeof crearRegisterSchema>>

/**
 * Entrada al portal: iniciar sesión o crear la cuenta.
 *
 * El registro no devuelve sesión aunque salga bien. La API contesta lo mismo
 * exista o no el correo —para que el formulario no sirva de listín de clientes—
 * así que aquí se enseña ese mensaje y se pasa a la pantalla de entrada con el
 * correo ya escrito. Un paso más, a cambio de que nadie pueda averiguar quién
 * es cliente de la agencia una dirección cada vez.
 */
export function AccountGate({ compact = false }: { compact?: boolean } = {}) {
  const t = useT()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [prefill, setPrefill] = useState('')

  return (
    // `compact` es para cuando esto va dentro de un diálogo: el diálogo ya pone
    // su propio título y su propio ancho, y un h1 ahí dentro le rompe la
    // jerarquía de encabezados a la página que hay detrás.
    <div className={compact ? '' : 'container-site max-w-lg py-12'}>
      {!compact && (
        <>
          <SectionHeading
            as="h1"
            light={
              mode === 'login'
                ? t('account.gate.title.login.light')
                : t('account.gate.title.register.light')
            }
            strong={t('account.gate.title.strong')}
          />
          <p className="mb-6 text-sm text-muted-foreground">
            {t('account.gate.intro')}
          </p>
        </>
      )}

      <div className="mb-6 flex gap-1 rounded-md border p-1">
        {(['login', 'register'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              'flex-1 rounded px-3 py-2 text-sm font-medium transition-colors',
              mode === value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary',
            )}
          >
            {value === 'login'
              ? t('account.gate.tab.login')
              : t('account.gate.tab.register')}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <LoginForm defaultEmail={prefill} />
      ) : (
        <RegisterForm
          onDone={(email) => {
            setPrefill(email)
            setMode('login')
          }}
        />
      )}
    </div>
  )
}

function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const t = useT()
  const { idioma } = useIdioma()
  const schema = useMemo(() => crearLoginSchema(t), [t])
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
    } catch (error) {
      toast.error(mensajeDeError(error, idioma, t('account.login.error')))
    }
  })

  return (
    <form onSubmit={onSubmit}>
      <Fieldset legend={t('account.login.legend')} columns={1}>
        <Field
          form={form}
          name="email"
          label={t('account.field.email')}
          type="email"
          autoComplete="email"
        />
        <Field
          form={form}
          name="password"
          label={t('account.field.password')}
          type="password"
          autoComplete="current-password"
        />
      </Fieldset>

      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        {t('account.login.submit')}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t('account.login.forgot')}
      </p>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: (email: string) => void }) {
  const t = useT()
  const { idioma } = useIdioma()
  const schema = useMemo(() => crearRegisterSchema(t), [t])
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      cellPhone: '',
      identification: '',
      password: '',
      passwordConfirm: '',
      acceptsMarketing: false,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        cellPhone: values.cellPhone,
        identification: values.identification || undefined,
        password: values.password,
        acceptsMarketing: values.acceptsMarketing,
      })
      toast.success(t('account.register.done'), { description: result.message })
      onDone(values.email)
    } catch (error) {
      toast.error(mensajeDeError(error, idioma, t('account.register.error')))
    }
  })

  return (
    <form onSubmit={onSubmit}>
      <Fieldset legend={t('account.register.legend')}>
        <Field
          form={form}
          name="firstName"
          label={t('account.field.firstName')}
          autoComplete="given-name"
        />
        <Field
          form={form}
          name="lastName"
          label={t('account.field.lastName')}
          autoComplete="family-name"
        />
        <Field
          form={form}
          name="email"
          label={t('account.field.email')}
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
        />
        <Field
          form={form}
          name="cellPhone"
          label={t('account.field.cellPhone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          form={form}
          name="identification"
          label={t('account.field.identification')}
          inputMode="numeric"
        />
        <Field
          form={form}
          name="password"
          label={t('account.field.password')}
          type="password"
          autoComplete="new-password"
          hint={t('account.field.password.hint', { min: MIN_PASSWORD })}
        />
        <Field
          form={form}
          name="passwordConfirm"
          label={t('account.field.passwordConfirm')}
          type="password"
          autoComplete="new-password"
        />
        <div className="sm:col-span-2">
          <Toggle
            form={form}
            name="acceptsMarketing"
            label={t('account.field.acceptsMarketing')}
          />
        </div>
      </Fieldset>

      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        {t('account.register.submit')}
      </Button>
    </form>
  )
}
