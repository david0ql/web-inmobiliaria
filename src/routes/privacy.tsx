import { SectionHeading } from '@/components/common/section-heading'
import { SITE } from '@/lib/site'

/** `/privacidad`. Pagina de texto, enlazada desde el pie de todo el sitio. */
export function Privacy() {
  return (
    <div className="container-site py-12">
      <SectionHeading as="h1" light="Políticas de" strong="privacidad" />

      <div className="max-w-3xl space-y-6 text-sm leading-relaxed text-muted-foreground">
        <Block title="Responsable del tratamiento">
          {SITE.name}, con domicilio en {SITE.address}, {SITE.city}, es
          responsable del tratamiento de los datos personales que recoge a través
          de este sitio web.
        </Block>

        <Block title="Datos que recogemos">
          Únicamente los que el visitante nos facilita: nombre, teléfono, correo
          electrónico y el mensaje o los datos del inmueble que decide
          compartirnos al solicitar una visita o al ofertar una propiedad.
        </Block>

        <Block title="Finalidad">
          Atender la solicitud recibida, contactar al interesado, agendar visitas
          y gestionar la relación comercial. No cedemos los datos a terceros ni
          los usamos con fines distintos a los indicados.
        </Block>

        <Block title="Conservación">
          Conservamos los datos mientras dure la relación comercial y, después,
          durante los plazos exigidos por la ley colombiana.
        </Block>

        <Block title="Derechos del titular">
          Conforme a la Ley 1581 de 2012 y sus decretos reglamentarios, el titular
          puede conocer, actualizar, rectificar y suprimir sus datos, así como
          revocar la autorización otorgada, escribiendo a{' '}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {SITE.email}
          </a>
          .
        </Block>

        <Block title="Contacto">
          Para cualquier duda sobre esta política puedes escribirnos a{' '}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {SITE.email}
          </a>{' '}
          o llamarnos al{' '}
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
