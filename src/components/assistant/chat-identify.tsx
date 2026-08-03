import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { identify, type ChatScope } from '@/lib/assistant'

/**
 * Los países desde los que escribe la gente, con Colombia primero.
 *
 * No es la lista de los 195: son los que aparecen en la cartera —el
 * colombiano que compra desde fuera— más los vecinos. Una lista completa
 * obliga a buscar; esta se recorre de un vistazo.
 */
const PAISES = [
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+1', flag: '🇺🇸', name: 'EE. UU. / Canadá' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
]

export interface Visitor {
  conversationId: string
  firstName: string
  /*
    El resto de datos viaja con el visitante durante la visita —solo en
    memoria— para poder reabrir un hilo nuevo al cambiar de inmueble sin
    volver a preguntarle nada.
  */
  lastName: string
  phone: string
  email: string
}

/**
 * Quién eres, antes de la primera pregunta.
 *
 * Es fricción y se nota. Se pide igualmente porque un chat anónimo deja al
 * equipo con una conversación interesante y nadie a quien llamar, y este chat
 * existe para traer clientes.
 *
 * Se pregunta una vez por visita: los datos viven en memoria, así que al
 * recargar la página se vuelve a preguntar y se abre un hilo nuevo. Es
 * deliberado — recordarlo entre visitas convierte el histórico en una sola
 * conversación inmensa que nadie puede revisar.
 */
export function ChatIdentify({
  scope,
  onReady,
}: {
  scope: ChatScope
  onReady: (visitor: Visitor) => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dial, setDial] = useState('+57')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const listo =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    phone.replace(/\D/g, '').length >= 7 &&
    /.+@.+\..+/.test(email)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!listo || enviando) return
    setEnviando(true)
    setError(null)
    try {
      const res = await identify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `${dial}${phone.replace(/\D/g, '')}`,
        email: email.trim(),
        propertyCode: scope.kind === 'PROPERTY' ? scope.code : undefined,
      })
      onReady({
        conversationId: res.conversationId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `${dial}${phone.replace(/\D/g, '')}`,
        email: email.trim(),
      })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No pudimos conectar. Inténtalo otra vez.',
      )
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Cuéntanos quién eres y te atiendo enseguida. Así tu asesor puede
        retomarlo contigo si hace falta.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Campo
          label="Nombre"
          value={firstName}
          onChange={setFirstName}
          autoComplete="given-name"
          autoFocus
        />
        <Campo
          label="Apellidos"
          value={lastName}
          onChange={setLastName}
          autoComplete="family-name"
        />
      </div>

      <div>
        <label
          htmlFor="chat-phone"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Celular
        </label>
        {/*
          El indicativo va aparte y no dentro del mismo campo: pegado al número
          la gente lo borra sin querer, o escribe el suyo encima y manda un
          +57+57. Separado no hay forma de equivocarse.
        */}
        <div className="flex gap-2">
          <select
            aria-label="Indicativo del país"
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            className="h-10 w-[7.5rem] shrink-0 rounded-md border bg-background px-2 text-sm"
          >
            {PAISES.map((p) => (
              <option key={p.code + p.name} value={p.code}>
                {p.flag} {p.code}
              </option>
            ))}
          </select>
          <input
            id="chat-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="300 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      <Campo
        label="Correo"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder="tu@correo.com"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={!listo || enviando} className="mt-1">
        {enviando && <Loader2 className="size-4 animate-spin" />}
        Empezar a chatear
      </Button>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Usamos tus datos solo para atenderte y que un asesor te contacte.
      </p>
    </form>
  )
}

function Campo({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string
  value: string
  onChange: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const id = `chat-${label.toLowerCase().replace(/\s/g, '-')}`
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        {...rest}
      />
    </div>
  )
}
