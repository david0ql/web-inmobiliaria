import { Mail, MessageCircle, Phone } from 'lucide-react'

import { SectionHeading } from '@/components/common/section-heading'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site'

/**
 * `/creditos`.
 *
 * OJO: esta pantalla esta a la espera del texto de la agencia. Aqui no se
 * nombra ningun banco, ni tasas, ni plazos, ni se promete aprobacion alguna:
 * son afirmaciones financieras sobre un negocio real y no me las puedo inventar.
 * Lo que hay es el armazon y una via de contacto, que es cierto y es util.
 *
 * Cuando llegue la informacion real —entidades con las que trabajan, requisitos,
 * pasos del tramite— entra aqui y ya tiene su sitio hecho.
 */
export function Credits() {
  const whatsapp = SITE.phone.replace(/\D/g, '')

  return (
    <div className="container-site py-12">
      <SectionHeading as="h1" light="Créditos" strong="hipotecarios" />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Comprar vivienda casi nunca se hace de contado, y el trámite del
            crédito suele ser la parte que más frena a la gente. Nuestros asesores
            te acompañan durante todo el proceso: te ayudan a entender qué
            necesitas reunir, a preparar la documentación y a coordinar con la
            entidad los tiempos de la compra.
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cuéntanos qué inmueble te interesa y en qué punto estás, y te decimos
            cómo seguir.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  'Hola, quiero información sobre crédito hipotecario.',
                )}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <MessageCircle />
                Consultar por WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={SITE.phoneHref}>
                <Phone />
                {SITE.phone}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={`mailto:${SITE.email}?subject=${encodeURIComponent(
                  'Consulta sobre crédito hipotecario',
                )}`}
              >
                <Mail />
                Escribir un correo
              </a>
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-2 text-xs font-bold tracking-widest uppercase">
            Antes de empezar
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada entidad pide sus propios requisitos y las condiciones cambian con
            frecuencia. Habla con un asesor para que te confirme las vigentes en el
            momento de tu compra.
          </p>
        </aside>
      </div>
    </div>
  )
}
