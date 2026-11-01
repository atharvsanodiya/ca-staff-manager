# CA Staff & Task Management System

A complete staff and task management system built for Chartered Accountant (CA) firms.

## Features

- **Admin & Staff Portals** — Role-based dashboards
- **Staff Management** — Add, edit, activate/deactivate employees
- **Task Management** — Create, assign, and track tasks with categories
- **Independent Tracking** — Each assignee tracks their progress independently
- **Categories** — ITR, TDS, Bookkeeping, GST, Project Report, Other
- **File Attachments** — Upload/download files per task (stored in R2)
- **Activity Log** — Full audit trail of all actions
- **Deadlines & Reminders** — Track due dates

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **File Storage**: Cloudflare R2
- **Backend**: Hono (TypeScript)
- **Frontend**: Vanilla JS SPA with Tailwind CSS
- **Auth**: JWT (HS256)

## Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |
| Staff | rahul    | staff123  |
| Staff | priya    | staff123  |
| Staff | amit     | staff123  |
| Staff | sneha    | staff123  |
| Staff | vikram   | staff123  |

## Development

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

## Deployment

```bash
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

## License

MIT
