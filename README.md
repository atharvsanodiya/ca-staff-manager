# AKSHAY MALU & ASSOCIATES — CA Staff & Task Management System

A complete staff and engagement management system built for **CA Akshay Malu & Associates (Chartered Accountants)**.

## Features

- **Admin & Staff Portals** — Role-based dashboards for Managing Partner & Associate Staff
- **Staff Management** — Add, edit, activate/deactivate employees & articles
- **Client Engagements & Task Management** — Create, assign, and track compliance matters
- **Independent Tracking** — Each assignee tracks their progress independently with audit notes
- **Categories** — ITR, TDS, Bookkeeping, GST, Project Report, Other
- **File Attachments** — Secure document storage in Cloudflare R2
- **Statutory Audit Log** — Full audit trail of all actions
- **Deadlines & Reminders** — Track due dates and statutory cutoffs (7th TDS, 11th GSTR-1, 20th GSTR-3B)

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **File Storage**: Cloudflare R2
- **Backend**: Hono (TypeScript)
- **Frontend**: Vanilla JS SPA with Tailwind CSS + Taste-Skill Art Direction
- **Auth**: JWT (HS256)

## Default Credentials

| Role  | Name | Username | Password  |
|-------|------|----------|-----------|
| **Managing Partner** | **CA Akshay Malu** | `akshay` (or `admin`) | `admin123`  |
| Staff | Rahul Sharma | `rahul` | `staff123`  |
| Staff | Priya Patel | `priya` | `staff123`  |
| Staff | Amit Kumar | `amit` | `staff123`  |
| Staff | Sneha Gupta | `sneha` | `staff123`  |
| Staff | Vikram Singh | `vikram` | `staff123`  |

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
