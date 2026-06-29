# ToqWow — CLAUDE.md (Documento de Sesión del Proyecto)

## Identidad del proyecto

**Nombre:** ToqWow  
**Pronunciación:** Toc-Uau  
**Tipo:** PWA infantil premium → empaquetada como app nativa (iOS + Android)  
**Público objetivo:** Niños y niñas de 2 a 10 años  
**Fundador y desarrollador:** Jesús (solo dev, mismo esquema que Goalsoka)  
**Estado:** En diseño / inicio de desarrollo

---

## La mascota

**Nombre del personaje:** Toqwow (mismo nombre que la app)  
**Especie:** Koalosauro Estelar (*Koalasaurus stellaris* — especie ficticia 100% original)  
**Descripción:** Criatura de fantasía, mezcla entre koala bebé + dinosaurio bebé + cachorro espacial. Cuerpo redondo y rechoncho color lila suave, cuatro orejas redondeadas (dos grandes + dos pequeñas), ojos enormes turquesa con triple brillo estilo Pixar, naricita coral de botón, dientito único redondeado, dos antenitas mágicas con esferas brillantes (dorada izquierda + turquesa derecha), colita esponjosa turquesa pastel, bracitos cortos con patitas gorditas.  
**Archivo de imagen:** `Toqwow.png` (generado con Midjourney — ícono 1024×1024px)  
**Archivos de logo:** `Toqwow_Logo_Marca.png` (vertical 1200×1500) y `Toqwow_Logo_Horizontal.png` (1800×580)

### Paleta de colores oficial

| Elemento | HEX |
|----------|-----|
| Cuerpo principal | `#B8A9FF` |
| Vientre / cara | `#FFE8D6` |
| Orejas interior | `#FFB3D1` |
| Ojos iris | `#00D4C8` |
| Ojos pupila | `#1A1040` |
| Antenita izquierda | `#FFD700` |
| Antenita derecha | `#00D4C8` |
| Colita | `#A8EDEA` |
| Nariz | `#FF7F7F` |
| Fondo ícono (gradiente) | `#7C6AE8` → `#00C9C0` |

---

## Concepto central

**366 mundos interactivos** — un mundo para cada día del año. El universo se llama **Sistema Tiqui**. No hay Game Over, no hay puntuación, no hay fracaso. Solo juego libre, exploración y descubrimiento.

**Mecánica diferenciadora — El Combinador Wow:**  
El niño arrastra dos objetos juntos y se produce una fusión inesperada con animación y sonido únicos (ej: nube + dinosaurio = dinosaurio que llueve estrellas). Cada mundo tiene entre 12 y 20 fusiones secretas descubribles. Es el elemento que Toca Boca no tiene.

---

## Modelo de negocio

| Tier | Precio | Acceso |
|------|--------|--------|
| Gratis | $0 | Mundo #0 completo (Planeta Tiqui) |
| Pack Individual | $3.99 c/u | 27-28 mundos temáticos (13 packs) |
| Premium Anual | $19.99/año | Los 366 mundos + todo el contenido futuro |

**Matemática de conversión:** 13 packs × $3.99 = $51.87 vs suscripción $19.99 → 61% de ahorro percibido. Punto óptimo para conversión al plan anual.

**Distribución de los 365 mundos pagos en 13 Packs:**

| Pack | Nombre | Mundos |
|------|--------|--------|
| 1 | Dinos del Espacio | 28 |
| 2 | Bosque Encantado | 28 |
| 3 | Ciudad de las Nubes | 28 |
| 4 | Océano de Cristal | 28 |
| 5 | Deportes Cósmicos | 28 |
| 6 | Granja Mágica | 28 |
| 7 | Taller de Inventos | 28 |
| 8 | Montañas Arcoíris | 28 |
| 9 | Desierto de Caramelo | 28 |
| 10 | Selva de Dinosaurios | 27 |
| 11 | Universo Bebé | 27 |
| 12 | Mundo Deportivo | 27 |
| 13 | Las Cuatro Estaciones | 27 |

---

## Stack tecnológico

### Frontend (PWA)
- **Framework:** Next.js 14 (App Router)
- **Motor de juego:** PixiJS v8 (WebGL + fallback Canvas2D) — 60 FPS en gama baja
- **Estado global:** Zustand
- **Audio:** Howler.js
- **Animaciones UI:** Framer Motion (fuera del canvas de PixiJS)
- **Service Workers:** Workbox
- **i18n:** JSON dinámicos con lazy loading — 27 idiomas

### Backend
- **Runtime:** Node.js + TypeScript
- **Hosting:** Render (Starter, mismo que Goalsoka)
- **Base de datos:** Supabase + PostgreSQL + Prisma ORM
- **Caché:** Redis
- **Pagos:** Paddle (web) + Pagopar (PY) + IAP nativo (Capacitor)

### Mobile
- **Empaquetado:** Capacitor v6
- **IAP:** `@capacitor-community/in-app-purchases`
- **Haptics:** `@capacitor/haptics` (feedback táctil crítico para 2-3 años)
- **Orientación:** Portrait lock con `@capacitor/screen-orientation`
- **Stores objetivo:** Google Play Store + Apple App Store

### Assets / CDN
- **Almacenamiento:** Cloudflare R2
- **Optimización:** Cloudflare Images (WebP automático)
- **Tamaño por mundo:** ~800KB promedio
- **App base instalada:** ~12MB (sin mundos)
- **Mundo #0:** pre-instalado (siempre offline)

---

## Arquitectura de carga

```
Descarga inicial: ~12MB
├── Shell PWA + UI
├── Motor PixiJS
├── Mundo #0 completo (pre-cacheado)
├── Toqwow mascota (todos los estados de animación)
└── Audio UI + música base

Por mundo descargado bajo demanda: ~800KB
├── scene.json          ← descripción de la escena
├── sprites.webp        ← spritesheet del mundo
├── audio/              ← efectos OGG comprimidos
└── fusions.json        ← recetas del Combinador Wow
```

**Experiencia de carga:** animación de Toqwow viajando en cohete. Si falla la red, el cohete da media vuelta con animación cómica. Nunca pantallas de error.

---

## Service Workers — 3 capas de caché

| Capa | Estrategia | Contenido |
|------|-----------|-----------|
| Shell permanente | Network First + fallback | Motor, UI, Toqwow, Mundo #0 |
| Mundos descargados | Cache First | Funciona 100% offline en avión |
| Assets de red | Stale While Revalidate | Miniaturas, actualizaciones |

---

## Internacionalización — 27 idiomas

Español, Inglés, Portugués, Francés, Alemán, Italiano, Japonés, Coreano, Mandarín Simplificado, Mandarín Tradicional, Árabe, Hindi, Indonesio, Ruso, Polaco, Turco, Neerlandés, Sueco, Noruego, Danés, Finlandés, Tailandés, Vietnamita, Ucraniano, Hebreo, Swahili, **Guaraní**.

**Nota estratégica:** El guaraní es el único idioma infantil que diferencia a ToqWow globalmente — ningún competidor lo tiene. Genera prensa local en Paraguay y posiciona la marca culturalmente.

Detección automática desde el dispositivo. Cambio disponible en ajustes parentales. Archivos JSON cargados bajo demanda, nunca todos juntos.

---

## UI sin texto — principios para 2 años

- Navegación 100% visual (iconografía + microanimaciones)
- Toqwow señala objetos interesantes si el niño no toca nada en 8 segundos
- Feedback auditivo en tres capas: UI suave / voz de Toqwow sin palabras / música ambiental adaptativa
- Respuesta háptica en cada objeto arrastrable (Capacitor Haptics)
- Latencia máxima de respuesta al toque: 200ms
- Cero pantallas de error — siempre animación de Toqwow como fallback

---

## Seguridad y cumplimiento legal

### Puerta Parental (triple barrera)
1. Cálculo matemático (imposible para niños de 2-7 años)
2. Instrucción escrita (requiere lectura)
3. Face ID / Touch ID (API nativa Capacitor)

### COPPA + GDPR-Kids
- Cero datos personales de menores recolectados directamente
- Perfil del niño almacenado localmente en el dispositivo
- Cuenta creada por el padre (adulto verificado)
- Progreso sincronizado bajo perfil del padre
- Sin analytics de comportamiento del menor en terceros
- Sin publicidad de ningún tipo
- Sin redes sociales ni chat en la app

---

## Sistema de retención

**Easter Eggs:** 3-7 por mundo, descubribles por accidente. No documentados en ningún lugar de la app.

**Toqwow Diario:** El Mundo #0 tiene una sorpresa nueva cada día. Construye hábito de apertura diaria.

**Colección de Toqwows:** Personalización del personaje (color pelaje, antenitas, accesorios). Accesorios desbloqueables por exploración, nunca por compra.

**Modo Siesta:** Música + animaciones suaves de Toqwow durmiendo. Activan los padres. Construye asociación emocional profunda con la app.

---

## Estructura de archivos del proyecto

```
toqwow/
├── CLAUDE.md
├── package.json
├── turbo.json                          ← Monorepo Turborepo
├── apps/
│   ├── web/                            ← Next.js PWA
│   │   ├── app/
│   │   │   ├── (shell)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx            ← Mapa de galaxia
│   │   │   │   ├── mundo/[id]/
│   │   │   │   ├── perfil/
│   │   │   │   └── padres/
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       ├── mundos/
│   │   │       ├── compras/
│   │   │       └── progreso/
│   │   ├── components/
│   │   │   ├── toqwow/
│   │   │   │   ├── ToqwowSprite.tsx
│   │   │   │   ├── ToqwowReaction.tsx
│   │   │   │   └── ToqwowGuide.tsx
│   │   │   ├── mundo/
│   │   │   │   ├── MundoCanvas.tsx     ← Canvas PixiJS
│   │   │   │   ├── MundoLoader.tsx     ← Animación cohete
│   │   │   │   ├── ObjetoDraggable.tsx
│   │   │   │   └── CombinadorWow.tsx   ← Motor de fusiones
│   │   │   ├── mapa/
│   │   │   │   ├── MapaGalaxia.tsx
│   │   │   │   ├── PlanetaCard.tsx
│   │   │   │   └── PackCard.tsx
│   │   │   ├── parental/
│   │   │   │   ├── PuertaParental.tsx
│   │   │   │   └── PanelPadres.tsx
│   │   │   └── ui/
│   │   │       ├── SinTexto/
│   │   │       └── Audio/
│   │   ├── lib/
│   │   │   ├── pixi/
│   │   │   │   ├── engine.ts
│   │   │   │   ├── physics.ts
│   │   │   │   └── fusiones.ts
│   │   │   ├── i18n/
│   │   │   │   ├── loader.ts
│   │   │   │   └── locales/            ← 27 archivos JSON
│   │   │   ├── audio/
│   │   │   │   └── soundManager.ts
│   │   │   └── haptics/
│   │   │       └── hapticsManager.ts
│   │   ├── store/
│   │   │   ├── useAccesoStore.ts       ← Premium / packs
│   │   │   ├── useProgresoStore.ts
│   │   │   ├── useToqwowStore.ts       ← Personalización
│   │   │   └── useAudioStore.ts
│   │   └── public/
│   │       ├── sw.js                   ← Service Worker Workbox
│   │       ├── manifest.json
│   │       ├── assets/toqwow/
│   │       └── mundos/mundo-0/         ← Único mundo pre-instalado
│   └── mobile/                         ← Capacitor wrapper
│       ├── android/
│       ├── ios/
│       └── capacitor.config.ts
├── packages/
│   ├── mundo-engine/                   ← Motor compartido de mundos
│   │   └── src/
│   │       ├── Scene.ts
│   │       ├── Objeto.ts
│   │       ├── Fusion.ts
│   │       └── EasterEgg.ts
│   ├── ui-kids/                        ← Design system infantil
│   └── types/                          ← Tipos TypeScript compartidos
└── backend/
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── mundos.ts
    │   │   ├── compras.ts
    │   │   └── progreso.ts
    │   ├── services/
    │   │   ├── paddleService.ts
    │   │   ├── iapService.ts
    │   │   └── accesoService.ts
    │   └── middleware/
    │       ├── authParental.ts
    │       └── coppa.ts
    └── prisma/
        └── schema.prisma
```

---

## Esquema de base de datos (Prisma)

```prisma
model Padre {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  plan         Plan      @default(FREE)
  planVence    DateTime?
  createdAt    DateTime  @default(now())
  perfiles     Perfil[]
  compras      Compra[]
}

model Perfil {
  id        String     @id @default(cuid())
  padreId   String
  padre     Padre      @relation(fields: [padreId], references: [id])
  nombre    String
  avatar    Json       // color pelaje, antenitas, accesorios
  edadAnios Int?
  progreso  Progreso[]
  createdAt DateTime   @default(now())
}

model Progreso {
  id              String   @id @default(cuid())
  perfilId        String
  perfil          Perfil   @relation(fields: [perfilId], references: [id])
  mundoId         String
  visitado        Boolean  @default(false)
  fusionesDesc    String[]
  easterEggsDesc  String[]
  tiempoTotal     Int      @default(0)
  updatedAt       DateTime @updatedAt
  @@unique([perfilId, mundoId])
}

model Compra {
  id            String     @id @default(cuid())
  padreId       String
  padre         Padre      @relation(fields: [padreId], references: [id])
  tipo          TipoCompra
  packId        String?
  monto         Decimal
  moneda        String     @default("USD")
  plataforma    Plataforma
  transaccionId String     @unique
  validadoEn    DateTime?
  createdAt     DateTime   @default(now())
}

enum Plan       { FREE PREMIUM }
enum TipoCompra { SUSCRIPCION_ANUAL PACK_INDIVIDUAL }
enum Plataforma { PADDLE PAGOPAR APPLE GOOGLE }
```

---

## Roadmap de desarrollo

| Fase | Semanas | Entregables clave |
|------|---------|-------------------|
| 0 — Fundación | 1-3 | Monorepo, design system, Toqwow en PixiJS, audio, Mundo #0 base |
| 1 — MVP | 4-8 | Mapa galaxia, auth parental, Puerta Parental, Paddle, Mundo #0 completo, PWA offline |
| 2 — Pack 1 | 9-12 | Motor de mundos JSON-driven, Pack Dinos del Espacio (28 mundos), suscripción, Capacitor |
| 3 — Lanzamiento | 13-16 | 13 packs completos, 27 idiomas, Play Store + App Store, personalización Toqwow, Modo Siesta |
| 4 — Crecimiento | Post | Analytics parentales, regalo entre familias, versión para guarderías |

---

## KPIs objetivo

| Métrica | 3 meses | 12 meses |
|---------|---------|----------|
| Descargas | 5,000 | 50,000 |
| DAU/MAU | 35% | 45% |
| Conversión free→pago | 8% | 12% |
| Churn suscripción anual | <5% | <3% |
| Rating App Store | 4.6+ | 4.7+ |
| LTV promedio | $12 | $18 |

---

## Referencias rápidas

| Item | Valor |
|------|-------|
| Repo (a crear) | `ToqWow/ToqWow` |
| Hosting web | Vercel |
| Hosting backend | Render |
| Base de datos | Supabase |
| CDN Assets | Cloudflare R2 |
| Pagos web | Paddle (Payoneer como destino) |
| IAP Android | Google Play Billing |
| IAP iOS | Apple StoreKit 2 |
| Mascota archivo | `Toqwow.png` (1024×1024) |
| Logo vertical | `Toqwow_Logo_Marca.png` |
| Logo horizontal | `Toqwow_Logo_Horizontal.png` |

---

## Infraestructura de deployment

### Mismo esquema que Goalsoka

| Servicio | Rol | Detalle |
|---------|-----|---------|
| GitHub | Repositorio | `ToqWow/ToqWow` (main) — auto-deploy en cada push |
| Vercel | Frontend | PWA Next.js 14 — deploy automático desde GitHub |
| Render | Backend | Node.js + TS — Starter $7/mes — dist/ compilado |
| Supabase | Base de datos | PostgreSQL + Prisma ORM |
| Cloudflare R2 | Assets mundos | ~800KB por mundo · 366 mundos = ~293MB total |
| Namecheap | Dominio | toqwow.com → CNAME a Vercel · SSL automático |

### Flujo de deploy

```
git push origin main
    ├── Vercel detecta cambios en apps/web/ → build Next.js → live en toqwow.com
    └── Render detecta cambios en backend/  → corre dist/index.js → live API
```

**Regla crítica (igual que Goalsoka):** siempre commitear tanto `backend/src/` (TypeScript fuente) como `backend/dist/` (JS compilado) porque Render corre `dist/` directamente.

---

## Métodos de pago — idénticos a Goalsoka

ToqWow usa exactamente los mismos tres sistemas de pago que Goalsoka, con el agregado de IAP nativo para las tiendas.

### 1. Paddle (pagos web — suscripción y packs)

Mismo setup que Goalsoka. Paddle es el merchant of record — maneja IVA/impuestos globalmente y paga directo a la cuenta Payoneer de Jesús (Stripe no opera en Paraguay).

| Producto | Price ID (a crear en Paddle) | Precio |
|---------|------------------------------|--------|
| Suscripción Anual | `toqwow_premium_anual` | $19.99/año |
| Pack 1 — Dinos del Espacio | `toqwow_pack_01` | $3.99 |
| Pack 2 — Bosque Encantado | `toqwow_pack_02` | $3.99 |
| Pack 3 — Ciudad de las Nubes | `toqwow_pack_03` | $3.99 |
| Pack 4 — Océano de Cristal | `toqwow_pack_04` | $3.99 |
| Pack 5 — Deportes Cósmicos | `toqwow_pack_05` | $3.99 |
| Pack 6 — Granja Mágica | `toqwow_pack_06` | $3.99 |
| Pack 7 — Taller de Inventos | `toqwow_pack_07` | $3.99 |
| Pack 8 — Montañas Arcoíris | `toqwow_pack_08` | $3.99 |
| Pack 9 — Desierto de Caramelo | `toqwow_pack_09` | $3.99 |
| Pack 10 — Selva de Dinosaurios | `toqwow_pack_10` | $3.99 |
| Pack 11 — Universo Bebé | `toqwow_pack_11` | $3.99 |
| Pack 12 — Mundo Deportivo | `toqwow_pack_12` | $3.99 |
| Pack 13 — Las Cuatro Estaciones | `toqwow_pack_13` | $3.99 |

**Por qué Paddle y no Stripe:** Stripe no permite cuentas de Paraguay. Paddle actúa como merchant of record global — cobra al usuario en su moneda, maneja impuestos locales, y transfiere el neto a Payoneer mensualmente (día 1–15 del mes siguiente).

**Cobro:** Payoneer cuenta de Jesús → mismo flujo que Goalsoka.

Variables de entorno Render:
```
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_VENDOR_ID=...
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
```

### 2. Pagopar (pagos locales Paraguay)

Mismo sistema que Goalsoka con Cloudflare Worker proxy para evitar CORS.

```
Pagopar proxy: pagopar-proxy-toqwow.jesmedcamp.workers.dev
Public key:  (a configurar en Pagopar)
Private key: (a configurar en Pagopar)
```

Integración: el usuario paraguayo ve Pagopar como opción de pago en la Puerta Parental. Funciona para suscripción anual y packs individuales con los mismos métodos locales (Tigo Money, Personal Pay, transferencia bancaria PY).

### 3. IAP nativo — Google Play Billing + Apple StoreKit 2

Para usuarios que descargan desde Play Store o App Store. Los pagos pasan 100% por las tiendas (Google/Apple se quedan el 30%, negociable a 15% para suscripciones > 1 año).

**Google Play — Product IDs:**
```
toqwow.premium.anual          → Suscripción $19.99/año
toqwow.pack.dinos             → Pack 1 $3.99
toqwow.pack.bosque            → Pack 2 $3.99
toqwow.pack.nubes             → Pack 3 $3.99
... (mismo patrón para los 13 packs)
```

**Apple App Store — Product IDs:**
```
com.toqwow.app.premium.anual
com.toqwow.app.pack.01
com.toqwow.app.pack.02
... (mismo patrón)
```

**Validación server-side (igual que Goalsoka):**
El backend valida cada compra IAP contra la API de Google Play Developer / Apple App Store Server antes de activar el acceso. Nunca confiar en el cliente.

```typescript
// backend/src/services/iapService.ts
async function validateGooglePurchase(purchaseToken: string, productId: string)
async function validateApplePurchase(receiptData: string, productId: string)
```

### 4. Lógica de acceso unificada

Sin importar por dónde pagó el usuario (Paddle, Pagopar o IAP), el `accesoService.ts` resuelve lo mismo:

```typescript
// backend/src/services/accesoService.ts
async function tieneMundoAcceso(padreId: string, mundoId: number): Promise<boolean> {
  const padre = await prisma.padre.findUnique({ where: { id: padreId }, include: { compras: true } })
  
  // Plan premium → acceso a los 366 mundos
  if (padre.plan === 'PREMIUM' && padre.planVence > new Date()) return true
  
  // Mundo #0 → siempre gratis
  if (mundoId === 0) return true
  
  // Verificar si compró el pack que contiene este mundo
  const packId = getPackIdForMundo(mundoId)
  return padre.compras.some(c => c.packId === packId && c.tipo === 'PACK_INDIVIDUAL')
}
```

---

## Agentes IA autónomos

Todos los agentes corren como cron jobs en Render. Mismo patrón de arquitectura que SOKA-MIND y SOKA-SHIELD en Goalsoka.

### WOW-MIND (Agente principal — diario 8AM Paraguay)

Análisis diario completo del ecosistema ToqWow:

```
Cron: 0 11 * * * (11:00 UTC = 8:00 AM PY)
LLM:  Groq llama-3.3-70b-versatile (primario) + Anthropic fallback
```

**Lo que analiza y reporta:**
- Usuarios activos del día (DAU) por perfil de edad
- Mundos más jugados en las últimas 24h
- Fusiones del Combinador Wow más descubiertas
- Easter Eggs encontrados por primera vez
- Conversiones free → pago del día
- Alertas de churn: suscripciones que vencen en 7 días
- Revenue del día (Paddle + Pagopar + IAP)
- Errores de backend detectados en logs
- Estado de los 3 agentes IA

**Output:** email HTML a jesmedcamp@hotmail.com con resumen ejecutivo + alertas críticas en rojo.

### WOW-SHIELD (Agente de seguridad — cada 10 minutos)

```
Cron: */10 * * * *
```

**Lo que vigila:**
- Rate limiting en endpoints de compra (máx 3 intentos/hora por IP)
- Intentos de bypass de la Puerta Parental
- Tokens Paddle/IAP inválidos o duplicados
- SQL injection en parámetros de mundos
- IDOR en endpoints de progreso (un padre no puede ver el progreso de otro)
- Headers de seguridad: CSP, HSTS, X-Frame-Options, X-Content-Type
- Anomalías de tráfico (spike > 10x del promedio → alerta inmediata)

**Output:** alerta inmediata por email si detecta amenaza crítica. Log silencioso si todo OK.

### WOW-KIDS (Agente COPPA/GDPR — diario + en cada deploy)

**Único en ToqWow, no existe en Goalsoka.**

```
Cron: 0 12 * * * (revisión diaria) + hook post-deploy
```

**Lo que audita:**
- Que ningún endpoint devuelva datos personales de menores a terceros
- Que la Puerta Parental esté activa en TODOS los flujos de compra
- Que los logs de sesión no contengan datos identificables de niños
- Que el campo `edadAnios` del modelo `Perfil` nunca llegue a analytics externos
- Que las cookies sean `HttpOnly + Secure + SameSite=Strict`
- Cumplimiento de retención de datos (borrado automático a los 30 días de inactividad de cuenta eliminada)
- Verifica que el endpoint `/api/auth/delete-account` funcione y borre en cascada

**Output:** reporte semanal de compliance (lunes 9AM PY) + alerta inmediata si detecta violación COPPA/GDPR.

---

## Panel admin — toqwow.com/admin

Acceso exclusivo del fundador. Server-side auth proxy (igual que Goalsoka — nunca exponer credenciales al cliente).

### Secciones del panel

**Dashboard principal:**
- KPIs en tiempo real: DAU, MAU, revenue del día, suscripciones activas
- Gráfico de conversión free→pago de los últimos 30 días
- Mapa de calor de mundos más jugados

**Usuarios / Padres:**
- Lista de cuentas con plan, fecha de vencimiento, email
- Ver perfiles de hijos (nombre, edad, mundos jugados, tiempo total)
- Acción: extender suscripción manualmente, revocar acceso, eliminar cuenta

**Mundos y Packs:**
- Estado de cada mundo: activo/inactivo, cantidad de sesiones, fusiones descubiertas
- Editar metadata de mundos (nombre, descripción, pack asociado)
- Activar/desactivar Easter Eggs específicos
- Ver qué fusiones son las más populares (Combinador Wow analytics)

**Ventas e ingresos:**
- Revenue por canal: Paddle vs Pagopar vs Google Play vs Apple
- Conversión por pack: cuál se vende más
- Historial de todas las transacciones con estado (completado / pendiente / reembolsado)
- Acción: emitir reembolso manual en Paddle dashboard

**Logs agentes IA:**
- Último reporte WOW-MIND (con posibilidad de forzar ejecución manual)
- Últimas alertas WOW-SHIELD con IP y endpoint afectado
- Último reporte WOW-KIDS con checklist de compliance
- Acción: `/api/admin/sync-mundos` — forzar sincronización de assets desde R2

**Endpoint de mantenimiento:**
```
POST /api/admin/wow-mind-now       → fuerza reporte inmediato
POST /api/admin/shield-scan-now    → fuerza escaneo de seguridad
POST /api/admin/kids-audit-now     → fuerza auditoría COPPA
POST /api/admin/flush-cache        → limpia caché Redis
POST /api/admin/sync-r2-manifest   → sincroniza manifest de assets R2
```

---

## Variables de entorno — Render (backend)

```env
# Base de datos
DATABASE_URL=postgresql://...supabase.co/postgres

# Auth
JWT_SECRET=toqwow-jwt-secret-2026
SYNC_SECRET=toqwow-sync-2026

# Pagos — Paddle (no Stripe — Paraguay no soportado por Stripe)
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_VENDOR_ID=...

# Pagos — Pagopar
PAGOPAR_PUBLIC_KEY=...
PAGOPAR_PRIVATE_KEY=...

# Pagos — IAP
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=...
APPLE_IAP_SHARED_SECRET=...

# Agentes IA
GROQ_API_KEY=...
ANTHROPIC_API_KEY=...

# Assets
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=toqwow-mundos

# Email (alertas agentes)
RESEND_API_KEY=...
ADMIN_EMAIL=jesmedcamp@hotmail.com

# Admin
ADMIN_PASSWORD_HASH=...
```

## Variables de entorno — Vercel (frontend)

```env
NEXT_PUBLIC_API_URL=https://toqwow-backend.onrender.com
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
NEXT_PUBLIC_R2_CDN_URL=https://cdn.toqwow.com
NEXT_PUBLIC_APP_URL=https://toqwow.com
```

---

## Referencias rápidas — actualizado

| Item | Valor |
|------|-------|
| Repo | `ToqWow/ToqWow` (a crear) |
| Frontend | Vercel → toqwow.com |
| Backend | Render → toqwow-backend.onrender.com |
| Base de datos | Supabase |
| CDN Assets | Cloudflare R2 → cdn.toqwow.com |
| Pagos web | Paddle (Payoneer como destino) |
| Pagos locales PY | Pagopar (Cloudflare Worker proxy) |
| IAP Android | Google Play Billing |
| IAP iOS | Apple StoreKit 2 |
| Email admin | jesmedcamp@hotmail.com |
| LLM agentes | Groq llama-3.3-70b + Anthropic fallback |
| Agente principal | WOW-MIND (8AM PY diario) |
| Agente seguridad | WOW-SHIELD (cada 10 min) |
| Agente compliance | WOW-KIDS (diario + post-deploy) |
| Panel admin | toqwow.com/admin |
| Mascota archivo | Toqwow.png (1024×1024) |
| Logo vertical | Toqwow_Logo_Marca.png |
| Logo horizontal | Toqwow_Logo_Horizontal.png |
