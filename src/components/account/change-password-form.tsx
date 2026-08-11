import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Field } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { changePassword } from '@/lib/portal'

const MIN_PASSWORD = 12

/*
  El esquema se construye con `t` ya resuelto: los mensajes se traducen y
  `useT` solo puede llamarse dentro de un componente.
*/
type T = ReturnType<typeof useT>

const crearSchema = (t: T) =>
  z
    .object({
      currentPassword: z.string().min(1, t('errors.password.current')),
      password: z
        .string()
        .min(MIN_PASSWORD, t('errors.password.min', { min: MIN_PASSWORD })),
      passwordConfirm: z.string(),
    })
    .refine((values) => values.password === values.passwordConfirm, {
      path: ['passwordConfirm'],
      message: t('errors.password.mismatch'),
    })
    .refine((values) => values.password !== values.currentPassword, {
      path: ['password'],
      message: t('errors.password.same'),
    })

type Values = z.infer<ReturnType<typeof crearSchema>>

/**
 * Cambiar la contraseña cierra todas las sesiones, incluida esta — si alguien
 * más la conocía, deja de servirle ahora y no cuando caduque su token. Por eso
 * después hay que volver a entrar, y conviene decirlo antes de que pase.
 */
export function ChangePasswordForm() {
  const t = useT()
  const schema = useMemo(() => crearSchema(t), [t])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', passwordConfirm: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword(values.currentPassword, values.password)
      toast.success(t('account.password.done'), {
        description: t('account.password.done.detail'),
      })
      form.reset()
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t('account.password.error'),
      )
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field
        form={form}
        name="currentPassword"
        label={t('account.field.currentPassword')}
        type="password"
        autoComplete="current-password"
      />
      <Field
        form={form}
        name="password"
        label={t('account.field.newPassword')}
        type="password"
        autoComplete="new-password"
        hint={t('account.field.newPassword.hint', { min: MIN_PASSWORD })}
      />
      <Field
        form={form}
        name="passwordConfirm"
        label={t('account.field.newPasswordConfirm')}
        type="password"
        autoComplete="new-password"
      />

      <p className="text-xs text-muted-foreground">
        {t('account.password.warning')}
      </p>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
        {t('account.password.submit')}
      </Button>
    </form>
  )
}
