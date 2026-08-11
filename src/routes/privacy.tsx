import { SectionHeading } from '@/components/common/section-heading'
import { SITE } from '@/lib/site'
import { useT } from '@/lib/i18n'

/** `/privacidad`. Pagina de texto, enlazada desde el pie de todo el sitio. */
export function Privacy() {
  const t = useT()

  return (
    <div className="container-site py-12">
      <SectionHeading
        as="h1"
        light={t('page.privacy.title.light')}
        strong={t('page.privacy.title.strong')}
      />

      <div className="max-w-3xl space-y-6 text-sm leading-relaxed text-muted-foreground">
        <Block title={t('page.privacy.controller.title')}>
          {t('page.privacy.controller.body', {
            name: SITE.name,
            address: SITE.address,
            city: SITE.city,
          })}
        </Block>

        <Block title={t('page.privacy.data.title')}>
          {t('page.privacy.data.body')}
        </Block>

        <Block title={t('page.privacy.purpose.title')}>
          {t('page.privacy.purpose.body')}
        </Block>

        <Block title={t('page.privacy.retention.title')}>
          {t('page.privacy.retention.body')}
        </Block>

        <Block title={t('page.privacy.rights.title')}>
          {t('page.privacy.rights.body')}{' '}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {SITE.email}
          </a>
          .
        </Block>

        <Block title={t('page.privacy.contact.title')}>
          {t('page.privacy.contact.body')}{' '}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {SITE.email}
          </a>{' '}
          {t('page.privacy.contact.phone')}{' '}
          <a
            href={SITE.phoneHref}
            className="font-medium text-foreground hover:underline"
          >
            {SITE.phone}
          </a>
          .
        </Block>
      </div>
    </div>
  )
}

function Block({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold tracking-widest text-foreground uppercase">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  )
}
