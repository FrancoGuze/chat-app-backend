# Backend - Real Time Chat
[English](README.md) | [Español](README.es.md)

Servidor WebSocket con Node.js + TypeScript + Supabase, organizado en una arquitectura por capas:

1. Repositories (acceso a datos)
2. Services (lógica de negocio)
3. Handlers WebSocket (transporte + routing de eventos)

## Arquitectura

**Composition root**
- `src/index.ts` integra todo.
- Crea el servidor HTTP + WebSocket.
- Instancia repositorios y servicios.
- Construye handlers WS con inyección de dependencias vía closures.

**Repositories** (`src/repository/`)
- `spUserRepository.ts` CRUD de usuarios + find-or-create.
- `spContactRepository.ts` relaciones en `users_contacts`.
- `spMessageRepository.ts` persistencia de mensajes y actualización de estado.
- `repositoriesTypes.ts` interfaces de repositorios.

**Services** (`src/services/`)
- `spUserService.ts` autenticación + carga de contactos.
- `spContactService.ts` asegura contactos mutuos.
- `spMessageService.ts` valida y guarda mensajes, restaura historial, actualiza estado.
- `servicesTypes.ts` interfaces de servicios.

**Routing WebSocket** (`src/handlers/`)
- `wsHandler.ts`
  - `createWsHandlers(deps)` devuelve handlers con deps por closure.
  - `handleWsMessage(ws, payload, handlers)` enruta por `payload.type`.
  - `handleWsClose(ws, activeConnections)` limpia conexiones.

**Eventos** (`src/handlers/events/`)
- `handleAuth.ts` autentica usuario, envía contactos + historial.
- `handleMessage.ts` asegura contactos, persiste mensaje, emite updates.
- `handleStatusUpdate.ts` actualiza estado y notifica al emisor.

**Estado en tiempo real**
- `realtime/activeConnectionsManager.ts` gestiona sockets activos en memoria.

## Entorno
Crear `backend/.env`:
- `PORT`
- `DB_URL`
- `DB_KEY`

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm start`
