import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { config as configurarZod } from 'zod'

import { router } from '@/router'
import './index.css'

/*
  Zod compila sus validadores con `Function()` si puede, y lo comprueba
  intentandolo dentro de un try. La ficha de inmueble la sirve la API, con su
  politica de seguridad, que no permite eso: la comprobacion fallaba, Zod caia
  solo a modo interpretado y todo seguia funcionando, pero el navegador
  registraba una violacion de seguridad en cada visita.

  Diciendoselo de antemano no llega a intentarlo. Lo que se valida aqui son
  formularios de cuatro campos: la diferencia no se mide.
*/
configurarZod({ jitless: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
