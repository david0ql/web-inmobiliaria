import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { SectionHeading } from '@/components/common/section-heading'
import { Field, Fieldset, Toggle } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { login, register } from '@/lib/portal'
import { cn } from '@/lib/utils'

/** La misma longitud que exige la API: doce. */
const MIN_PASSWORD = 12

const loginSchema = z.object({
  email: z.email('Ese correo no parece válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Escribe tu nombre.'),
    lastName: z.string().trim().min(2, 'Escribe tus apellidos.'),
    email: z.email('Ese correo no parece válido.'),
    cellPhone: z.string().trim().min(7, 'Necesitamos un teléfono para llamarte.'),
    identification: z.string().trim().optional(),
    password: z
      .string()
      .min(MIN_PASSWORD, `Usa al menos ${MIN_PASSWORD} caracteres.`),
    passwordConfirm: z.string(),
    acceptsMarketing: z.boolean(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Las contraseñas no coinciden.',
  })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

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
            light={mode === 'login' ? 'Entra a' : 'Crea'}
            strong="tu cuenta"
          />
          <p className="mb-6 text-sm text-muted-foreground">
            Desde aquí publicas tus inmuebles y sigues sus visitas. Es la misma
            cuenta que usa tu asesor para tenerte al día.
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
            {value === 'login' ? 'Ya tengo cuenta' : 'Soy nuevo'}
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
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail, password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos entrar. Revisa tu conexión e inténtalo otra vez.',
      )
    }
  })

  return (
    <form onSubmit={onSubmit}>
      <Fieldset legend="Iniciar sesión" columns={1}>
        <Field
          form={form}
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
        />
        <Field
          form={form}
          name="password"
          label="Contraseña"
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
        Entrar
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        ¿Olvidaste la contraseña? Escríbele a tu asesor y te la restablece.
      </p>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: (email: string) => void }) {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
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
      toast.success('Datos recibidos', { description: result.message })
      onDone(values.email)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos crear la cuenta. Inténtalo otra vez.',
      )
    }
  })

  return (
    <form onSubmit={onSubmit}>
      <Fieldset legend="Tus datos">
        <Field form={form} name="firstName" label="Nombre" autoComplete="given-name" />
        <Field form={form} name="lastName" label="Apellidos" autoComplete="family-name" />
        <Field
          form={form}
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
        />
        <Field
          form={form}
          name="cellPhone"
          label="Celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          form={form}
          name="identification"
          label="Cédula (opcional)"
          inputMode="numeric"
        />
        <Field
          form={form}
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          hint={`Al menos ${MIN_PASSWORD} caracteres. Una frase que recuerdes es mejor que ocho símbolos.`}
        />
        <Field
          form={form}
          name="passwordConfirm"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
        />
        <div className="sm:col-span-2">
          <Toggle
            form={form}
            name="acceptsMarketing"
            label="Quiero recibir novedades de la agencia"
          />
        </div>
      </Fieldset>

      <Button
        type="submit"
        className="mt-6 w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        Crear cuenta
      </Button>
    </form>
  )
}
