# dynamic365-poc

A personal side project to get my hands dirty with **Microsoft Power Apps / Dataverse** (the data platform behind Dynamics 365).

The goal was to learn how Dataverse works from the outside: app registration and auth, the Web API (OData), alternate keys, upserts, lookups, paging and change tracking. **Code quality was not the focus.** Expect rough edges, no tests worth mentioning, and shortcuts everywhere.

## Stack

- NestJS (TypeScript, ESM)
- `@azure/msal-node` for app-only (client credentials) auth against Dataverse
- Dataverse Web API v9.2
- `node:sqlite` for a local mirror of the data

## Dataverse model

Two custom tables, both created in Power Apps:

- **`poc_customer`**: a customer, identified by an alternate key on `poc_email`.
- **`poc_ticket`**: a support ticket, identified by an alternate key on `poc_externalref`, with a `poc_Customer` lookup to the customer.

## Features

### Auth (`src/dataverse/dataverse-auth.service.ts`)
Gets an access token for the Dataverse environment through MSAL client credentials, using an app registration in Entra ID.

### Dataverse client (`src/dataverse/dataverse-client.service.ts`)
A thin `fetch` wrapper around the Web API:
- `request()`: authenticated calls that retry on `429` / `503` and honour `Retry-After`.
- `paginate()`: follows `@odata.nextLink` across pages.
- `deltaSync()`: walks a change-tracking feed and returns the next `@odata.deltaLink`.

### Error mapping (`src/dataverse/dataverse-exception.filter.ts`)
Turns Dataverse errors into clean JSON responses. A `429` is passed through so callers can back off. Every other Dataverse error comes back as `502`.

### Tickets API (`src/tickets/`)
- `POST /tickets`: upserts the customer (by email), then upserts the ticket (by external ref) and links it to the customer with `@odata.bind`. Sending the same payload twice updates the records instead of duplicating them.
- `GET /tickets`: lists tickets with their customer expanded, newest first.

### Sync to a local mirror (`src/sync/`)
- A cron job runs every minute. It pulls changes to tickets from Dataverse through change tracking (delta links) and applies them to a local SQLite database (`data/mirror.db`).
- The first run does a full sync. Later runs only fetch what changed, deletes included.
- If Dataverse rejects the delta link (expired or invalid), the job falls back to a full resync.
- `POST /sync/run` triggers a sync by hand. `GET /sync/tickets` reads the local mirror.

### Scratch scripts (`scripts/`)
One-off scripts I used while exploring. Run each one from the repo root with `node --env-file=.env scripts/<script>`.
- `test.mjs`: auth smoke test (`WhoAmI`).
- `check.mjs`: inspects the table metadata (entity set names, columns, keys, lookups).
- `setup.mjs`: creates the alternate keys through the metadata API.
- `upsert.mjs`: runs the customer and ticket upsert twice to show create (`201`) vs update (`204`).

## Running it

Copy the template and fill it in:

```bash
cp template.env .env
```

The app registration needs an application user in the Dataverse environment with a security role that can access the `poc_*` tables.

```bash
npm install
npm run start:dev   # http://localhost:3333 (or $PORT)
```
