# Backend - Real Time Chat
[English](README.md) | [Español](README.es.md)

WebSocket server built with Node.js + TypeScript and Supabase, organized using a layered architecture:

1. Repositories (data access)
2. Services (business logic)
3. WebSocket handlers (transport + event routing)

## Architecture

**Composition root**
- `src/index.ts` wires everything together.
- Creates the HTTP server + WebSocket server.
- Instantiates repositories and services.
- Builds WS handlers via dependency-injected closures.

**Repositories** (`src/repository/`)
- `spUserRepository.ts` user CRUD + find-or-create.
- `spContactRepository.ts` contact relationships in `users_contacts`.
- `spMessageRepository.ts` message persistence and status updates.
- `repositoriesTypes.ts` repository interfaces.

**Services** (`src/services/`)
- `spUserService.ts` authentication + contact loading.
- `spContactService.ts` ensures mutual contact pairs.
- `spMessageService.ts` validates and persists messages, restores history, updates status.
- `servicesTypes.ts` service interfaces.

**WebSocket routing** (`src/handlers/`)
- `wsHandler.ts`
  - `createWsHandlers(deps)` returns handlers with deps bound via closure.
  - `handleWsMessage(ws, payload, handlers)` routes by `payload.type`.
  - `handleWsClose(ws, activeConnections)` handles cleanup.

**Events** (`src/handlers/events/`)
- `handleAuth.ts` authenticates user, sends contacts + history.
- `handleMessage.ts` ensures contact pairing, persists message, emits updates.
- `handleStatusUpdate.ts` updates message status and notifies sender.

**Realtime state**
- `realtime/activeConnectionsManager.ts` manages active user sockets in memory.

## Environment
Create `backend/.env`:
- `PORT`
- `DB_URL`
- `DB_KEY`

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm start`
