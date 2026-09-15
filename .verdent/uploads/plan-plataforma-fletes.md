# Plan de Plataforma de Fletes — Marketplace con Pago en Garantía

**Versión:** 1.0 — 12/09/2026
**Estado:** Plan base, sujeto a iteración continua

---

## 1. Visión

Plataforma web (app en fase 2) que conecta clientes que necesitan transportar algo (caja, máquina, hacienda, vehículo, pallet) con transportistas disponibles. El diferencial frente a la competencia:

1. **El cliente publica el precio que puede pagar** y los transportistas pujan (subasta) — no precio fijo impuesto por la plataforma.
2. **Comisión baja (3–12% según categoría)** vs. 15–20% de modelos tipo BlackBuck.
3. **Pago retenido en garantía** hasta confirmar entrega con foto + DNI del receptor.
4. **Documentación del transportista oculta** hasta que acepta el flete — el cliente opera seguro.

## 2. Mercado y competencia

### Argentina
| Player | Modelo | Diferencial |
|---|---|---|
| **Rutazo** | Marketplace de cargas, líder local | Pago en garantía vía MercadoPago, transportistas verificados, ya mueve hacienda (SENASA), maquinaria, mudanzas |
| **Fletaló** | Marketplace de mudanzas/fletes | Cotización instantánea, fleteros validados (Google for Startups) |

### Internacional
| Player | País | Aprendizaje |
|---|---|---|
| **Uber Freight** | EE.UU./Europa | Reservas rápidas, tracking en vivo, docs digitales |
| **BlackBuck** | India (unicornio) | 1,2M camiones; cobra 15–20%; tuvo que sumar herramientas (GPS, combustible, financiación) para retener transportistas |
| **Sherpa** | España | Pago en custodia + foto en origen + QR en recogida/entrega |

**Conclusión:** El modelo está validado. La oportunidad está en el formato de subasta con comisión baja.

## 3. Modelo comercial

### Comisiones (por flete, sobre valor total)
| Categoría | Comisión |
|---|---|
| Paquetería (por bulto/kilo) | 3–5% |
| Pallets | 4–10% |
| Maquinaria / vehículos (requiere carreton) | 10–12% |

- La comisión se cobra a **ambas partes** (la define la categoría declarada, no se negocia por viaje).
- **Declaración de carga obligatoria.** Declarar mal la categoría para pagar menos comisión → penalidad escalonada hasta expulsión del sistema.
- **Adelanto en efectivo:** válido en fletes grandes. El cliente adelanta el monto que quiera, pero la comisión se calcula sobre el valor total del flete y debe estar paga para habilitar el despacho. El adelanto se registra en la plataforma (monto + comprobante fotográfico).

### Pagos — marketplace (no construir billetera propia)
- **MercadoPago modelo marketplace / split de pagos** (el dinero nunca toca nuestra cuenta).
- Flujo: cliente paga → PSP retiene → confirmación de entrega → split: transportista recibe su parte, comisión a nuestra cuenta.
- Alternativa futura si se necesita más control: dLocal / Ualá Bis.
- **No construir custodia propia** (regulación BCRA, licencias PSP).

## 4. Mecánica de subasta

1. Cliente publica: origen, destino, tipo de carga, fotos, peso/volumen, **precio inicial**.
2. Transportistas de la zona puja: aceptan el precio o ofrecen otro (más o menos).
3. Cliente elige oferta viendo reputación (estrellas + cantidad de viajes).
4. Al aceptar: se desbloquean contactos + documentación del vehículo.
5. Pago → retención → despacho → entrega confirmada → liberación.

**Decisión pendiente:** pujas abiertas (todos ven las ofertas, estilo Mercado Libre — *recomendada*) vs. cerradas. → Propuesta: **abiertas con tiempo límite**.

## 5. Producto

### MVP — Web (multi-provincia, lanzamiento controlado)

**Módulo 1 — Cuentas y perfiles (sem 1–2)**
- Auth: correo + Google (Firebase Auth o Auth0)
- Rol cliente y rol transportista (combinables)
- Perfil transportista: vehículo, rubro, documentación (seguro, habilitación, VTV), verificación
- Perfil cliente: datos básicos + reputación

**Módulo 2 — Publicaciones y subasta (sem 3–4)**
- Alta de flete: origen, destino, categoría, fotos, peso/volumen, precio inicial o "a acordar"
- Estimador simple: km de ruta × tarifa referencial por categoría (sin peajes en MVP)
- Feed filtrable por zona, categoría, fecha
- Sistema de pujas con tiempo límite

**Módulo 3 — Transacción y escrow (sem 5–7)**
- Match → desbloqueo de contactos y documentación
- Pago → retención en PSP (MercadoPago)
- Flujo de entrega: foto de carga al salir → foto en destino + DNI del receptor → liberación
- Registro de adelantos en efectivo
- Split automático con comisión

**Módulo 4 — Reputación y moderación (sem 8)**
- Calificación de 5 estrellas + reseña, obligatoria tras operación cerrada
- Panel de denuncias por carga mal declarada
- Reglas de penalización / expulsión

### Fase 2 (post-MVP)
- App móvil (Flutter o React Native, una sola base de código)
- Tracking GPS en vivo del viaje (en MVP: GPS del navegador del teléfono del transportista, obligatorio, con alerta si se apaga)
- Estimador con peajes por concesionaria
- Monetización adicional: seguro de carga, financiación, destacados

## 6. Stack técnico

| Capa | Elección |
|---|---|
| Frontend | Next.js (React) |
| Auth + DB + fotos | Firebase (Auth, Firestore, Storage) |
| Pagos | MercadoPago Marketplace API |
| Mapas/rutas | Mapbox (alternativa: Google Maps) — km de ruta |
| Notificaciones | Firebase Cloud Messaging (email/WhatsApp como backup) |
| App fase 2 | Flutter o React Native |

Duración estimada MVP: **6–8 semanas** con equipo chico (1 dev full-stack + 1 frontend o diseñador-dev).

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| **Desintermediación** (se contactan por fuera) | Comisión baja (3–12%) hace que no les convenga arriesgar reputación/garantía de pago. Pago retenido solo existe dentro de la plataforma |
| **Huevo-gallina** | Lanzamiento controlado por zona (1–3 provincias). Captar transportistas primero con oferta: sin comisión los primeros 3 meses o bonus por referidos |
| **Fraude en categoría declarada** | Penalidad escalonada hasta expulsión + calificación del otro lado + foto de la carga en origen |
| **Regulación de pagos** | PSP marketplace de terceros, nunca custodia propia |
| **Calidad de transportistas** | Verificación documental + reputación visible + documentación oculta hasta match |

## 8. Preguntas abiertas

1. Pujas abiertas vs. cerradas → propuesta: abiertas con límite de tiempo
2. Zona de lanzamiento exacta (¿Córdoba? ¿AMBA? ¿Rosario?)
3. Nombre de marca / dominio
4. ¿Reputación con alguna métrica extra (porcentaje de viajes completados, puntualidad)?

---

*Documento vivo — se corrige a medida que avanza el proyecto.*
