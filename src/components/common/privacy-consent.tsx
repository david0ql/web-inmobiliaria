import { Link } from '@/lib/nav'
import { useT } from '@/lib/i18n'

/** Consentimiento explícito antes de enviar datos personales. */
export function PrivacyConsent({ className = '' }: { className?: string }) {
  const t = useT()
  return (
    <label className={`flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground ${className}`}>
      <input
        type="checkbox"
        name="privacyConsent"
        required
        onInvalid={(event) =>
          event.currentTarget.setCustomValidity(t('privacy.consent.required'))
        }
        onInput={(event) => event.currentTarget.setCustomValidity('')}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>
        {t('privacy.consent.prefix')}{' '}
        <Link
          to="/privacidad"
          target="_blank"
          className="font-medium text-foreground underline underline-offset-2"
        >
          {t('privacy.consent.link')}
        </Link>
        {t('privacy.consent.suffix')}
      </span>
    </label>
  )
}
