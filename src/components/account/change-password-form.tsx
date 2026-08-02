import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Field } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { changePassword } from '@/lib/portal'

const MIN_PASSWORD = 12

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    password: z
      .string()
      .min(MIN_PASSWORD, `Usa al menos ${MIN_PASSWORD} caracteres.`),
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((values) => values.password !== values.currentPassword, {
    path: ['password'],
    message: 'Tiene que ser distinta de la actual.',
  })

type Values = z.infer<typeof schema>

/**
 * Cambiar la contraseña cierra todas las sesiones, incluida esta — si alguien
 * más la conocía, deja de servirle ahora y no cuando caduque su token. Por eso
 * después hay que volver a entrar, y conviene decirlo antes de que pase.
 */
export function ChangePasswordForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', passwordConfirm: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword(values.currentPassword, values.password)
      toast.success('Contraseña cambiada', {
        description: 'Vuelve a entrar con la nueva.',
      })
      form.reset()
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos cambiar la contraseña.',
      )
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field
        form={form}
        name="currentPassword"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
      />
      <Field
        form={form}
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        hint={`Al menos ${MIN_PASSWORD} caracteres.`}
      />
      <Field
        form={form}
        name="passwordConfirm"
        label="Repite la nueva"
        type="password"
        autoComplete="new-password"
      />

      <p className="text-xs text-muted-foreground">
        Al cambiarla se cierran todas tus sesiones y tendrás que volver a entrar.
      </p>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        Cambiar contraseña
      </Button>
    </form>
  )
}
