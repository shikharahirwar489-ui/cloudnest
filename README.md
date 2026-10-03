# CloudNest

CloudNest is a self-hostable file library built with Next.js 16, TypeScript, Prisma, and PostgreSQL. It uses email and password accounts; each normalized email address is unique. File metadata is stored in PostgreSQL and file contents are handled by a server-side storage adapter.

## Features

- Email and password registration, email verification, login, logout, and password reset
- Private file upload, download, search, rename, starring, trash, and restore
- Folder creation, storage quota display, and revocable share links
- Local disk storage for development and Telegram Bot API storage as an optional provider
- Responsive interface, server-side session records, Zod validation, Argon2 password hashes, and security headers

## Requirements

- Node.js 20.9 or newer
- PostgreSQL 14 or newer
- A Telegram bot and private storage chat when using Telegram storage
- An SMTP account with a verified sender for production email delivery

## Local development

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to a PostgreSQL database and replace `AUTH_SECRET` with a random value of at least 32 characters.
4. Apply the development migration with `npx prisma migrate dev`.
5. Start the app with `npm run dev` and open `http://localhost:3000`.

When `STORAGE_PROVIDER=local`, file contents are written under `./uploads`. When SMTP is not configured in development, registration returns a local verification link and reset links are printed to the development server log. Do not use these development behaviors in production.

## Telegram storage

Set `STORAGE_PROVIDER=telegram`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_STORAGE_CHAT_ID`. Add the bot to a private Telegram chat where it can send documents. Keep the chat private and keep the bot token in server-side environment settings only.

The standard Telegram Bot API currently allows bot uploads up to 50 MB but downloads up to 20 MB. CloudNest therefore caps Telegram uploads at 20 MB when using `https://api.telegram.org`, even if `UPLOAD_MAX_BYTES` is set higher. CloudNest attempts to delete the stored Telegram message when a user permanently deletes a file; Telegram may reject deletion when its Bot API limits or chat permissions prevent it. A deletion error leaves the CloudNest record in Trash so the user can retry or contact support. This means Telegram cannot guarantee the requested retention promise (“until the user deletes it”); choose storage with reliable object deletion before opening registration to the public. Read Telegram's current [Bot API file limits](https://core.telegram.org/bots/api#sending-files) and [deleteMessage limitations](https://core.telegram.org/bots/api#deletemessage) before relying on Telegram as the only copy of user data.

Telegram storage is not end-to-end encrypted by CloudNest. The operator and the Telegram account controlling the storage chat can access stored files. Do not advertise private or encrypted storage without implementing and reviewing encryption first.

`TELEGRAM_API_BASE_URL` can point to a self-hosted Bot API server. In local-server mode, Telegram may return an absolute path instead of a downloadable URL; the CloudNest app must be able to read that same path, so mount the Bot API file directory into the app container. The current app buffers uploads in memory, so raising the upload limit substantially requires a streaming upload implementation and memory/load testing first. Telegram's hosted and local Bot API modes do not make the Telegram chat itself a server that CloudNest owns.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Secret used by session/authentication code |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical app URL used in verification, reset, and share links; a host-provided URL works before you buy a domain |
| `STORAGE_PROVIDER` | No | `local` for development or `telegram` for Telegram storage |
| `TELEGRAM_BOT_TOKEN` | Telegram | Secret token from BotFather |
| `TELEGRAM_STORAGE_CHAT_ID` | Telegram | ID of the private storage chat |
| `TELEGRAM_API_BASE_URL` | No | Bot API base URL; defaults to Telegram's hosted API |
| `UPLOAD_MAX_BYTES` | No | Maximum upload size; default is 50 MiB, with a 20 MiB cap for Telegram's hosted API |
| `STORAGE_QUOTA_BYTES` | No | Per-account quota; default is 10 GiB |
| `EMAIL_SERVER_HOST` | Production | SMTP hostname |
| `EMAIL_SERVER_PORT` | Production | SMTP port; defaults to 587 |
| `EMAIL_SERVER_USER` | Production | SMTP username |
| `EMAIL_SERVER_PASSWORD` | Production | SMTP password or application password |
| `EMAIL_FROM` | Production | Verified sender address, for example `CloudNest <no-reply@example.com>` |

Never commit `.env`, database credentials, SMTP passwords, or Telegram tokens. Never prefix server secrets with `NEXT_PUBLIC_`.

## Production deployment

Deploy as a Node.js server (not a static export) with a managed PostgreSQL database and persistent, private storage. The app needs a stable public URL and HTTPS. You can begin with the hostname assigned by your hosting provider and update `NEXT_PUBLIC_APP_URL` when you choose a custom domain. For a free demo, Render offers a Node web service, but its free instance sleeps after 15 minutes of inactivity, has an ephemeral filesystem, and is explicitly not intended for production; its free Postgres expires after 30 days. Do not use Render Free Postgres for user account data. See [Render's current free plan limitations](https://render.com/docs/free). The free Render web service also has limited RAM and may be unreliable for concurrent file uploads.

Configure all production environment variables in the host's secret settings, then:

1. Run `npm ci` during install/build.
2. Run `npm run build` to generate Prisma Client and build Next.js.
3. Run `npx prisma migrate deploy` as a release step before starting the new app version.
4. Run `npm start` to serve the app.
5. Verify signup, email verification, login, upload, download, share-link revocation, password reset, and account-session revocation using real production services.

Do not point production at the local `uploads` directory unless the host explicitly provides a persistent private volume and you have a backup/restore plan. Keep database backups and file-storage backups. Add shared rate limiting before running multiple app instances; the current rate limiter is process-local. Use a host with request size and duration limits that fit the configured upload size.

## Public launch status

This repository is source code for a self-hosted project; making the GitHub repository public does not deploy a public website. Before accepting public users, complete a security review, configure durable storage and backups, configure shared abuse controls, review file deletion and retention behavior, and replace the draft legal/policy pages with content reviewed for your service and jurisdiction. CloudNest does not currently provide end-to-end encryption, virus scanning, or a security/compliance certification.

Some account and dashboard features are still incomplete, including theme selection, folder rename/move/trash controls, full share-link management, and folder-aware deletion. The current file deletion behavior is storage-provider-dependent. Do not promise features or privacy guarantees that have not been implemented and verified.

## Development commands

- `npm run dev` — start the local development server
- `npm run lint` — lint the source
- `npm run build` — generate Prisma Client and build the app
- `npx prisma migrate dev` — create/apply local development migrations
- `npx prisma migrate deploy` — apply checked-in migrations in production

## Contributing

Validate all untrusted inputs at route boundaries, scope private database access to the authenticated owner, and keep provider-specific behavior behind `lib/storage/StorageProvider.ts`.
