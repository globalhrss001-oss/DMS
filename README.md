# Global HR DMS

Document Management System for **Global HR Staffing Services Pte., Ltd.**

A Next.js web app on Firebase (Auth + Firestore + **Cloud Storage**) where staff
manage candidates and their documents. Files are stored in **Firebase Storage**;
all searchable metadata, permissions, and the activity trail live in Firestore.

## Architecture

```
Browser (Next.js)  ->  Firebase Auth        (staff login)
                   ->  Firestore            (candidates, document metadata, audit logs)
                   ->  Firebase Storage      (the actual files)
```

The browser talks directly to Firebase Storage and Firestore using the Firebase
Web SDK. Access is enforced entirely by **Security Rules**:

- **Storage rules** — only authenticated staff can read/upload files; only admins
  can delete objects; uploads are capped at 20 MB.
- **Firestore rules** — staff can create validated `documents` metadata and
  append-only `auditLogs`; only admins can soft-delete a document (flip its
  status to `deleted`); audit logs are immutable.

No service accounts, no Google Workspace Shared Drive, and no Cloud Functions are
required for document handling — everything runs on the client SDK behind rules.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Firebase Web SDK v11 (Auth, Firestore, Storage)
- Firebase App Hosting (deploy)

## Project layout

```
/                     Next.js app (App Router under src/app)
  src/lib/            firebase init, types, db helpers, documents (storage) helpers
  src/context/        AuthContext (auth state + role)
  src/components/     Nav, forms, upload, badges, modal
  src/app/(app)/      protected pages: dashboard, candidates, admin
firestore.rules       Firestore security rules
firestore.indexes.json composite indexes
storage.rules         Firebase Storage security rules
apphosting.yaml       App Hosting config
functions/            (legacy Drive bridge — not used, kept for reference)
```

## Prerequisites

- Node 20+
- A Firebase project (the **Blaze** plan is recommended; App Hosting requires it)
- Firebase CLI via `npx -y firebase-tools@latest`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Select the Firebase project

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use global-hr-dms
```

### 3. Enable Auth (email/password) and register a Web app

Enable Email/Password in the Firebase Console (Authentication > Sign-in method).

Register a Web app and copy its config into `.env.local` (start from
`.env.local.example` and fill the `NEXT_PUBLIC_*` values).

### 4. Enable Firebase Storage

In the Firebase Console: **Build > Storage > Get started**. Choose a location
(e.g. `asia-southeast1`, Singapore). This provisions the default bucket
(`global-hr-dms.firebasestorage.app`) referenced by
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

### 5. Deploy Firestore + Storage rules and indexes

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage
```

### 6. Create the first admin user

1. Create a user in Authentication (Console > Users > Add user), copy the UID.
2. Add a Firestore document at `users/{uid}`:
   ```json
   { "email": "you@globalhr.com", "displayName": "Admin", "role": "admin" }
   ```

### 7. Run locally

```bash
npm run dev
# open http://localhost:3000  (ensure `localhost` is an Authorized Domain in Auth settings)
```

### 8. Deploy the web app (App Hosting)

Fill the `env` values in [apphosting.yaml](apphosting.yaml), then:

```bash
npx -y firebase-tools@latest deploy
```

---

## Notes & limitations (MVP)

- **Upload size:** capped at 20 MB per file in both the UI and Storage rules.
  Uploads are resumable (via the Storage SDK) and show live progress. Raise the
  limit in `storage.rules` and `src/lib/documents.ts` if larger files are needed.
- **Audit trail:** written client-side as append-only `auditLogs` (staff can
  create, no one can edit/delete). For stronger tamper-resistance later, move
  audit writes into a Firestore `onCreate` trigger (Cloud Function).
- **Security rules** are a solid prototype and should be reviewed before a wide
  launch.
- **Expiry alerts:** the dashboard surfaces expiring documents via a live
  Firestore query. Scheduled email alerts can be added later via Cloud Functions.

## Deferred (post-MVP)

Bulk migration of the existing archive, server-side audit hardening, scheduled
expiry email alerts, and AI CV parsing (Firebase AI Logic).
