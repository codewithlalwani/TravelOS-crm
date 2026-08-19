# Flight Connect Travel Tech CRM — Phased Build Plan

## Context
An earlier round of analysis (based on screenshots + a "Customer Acknowledgement" PDF of a third-party product, "BlazeBE"/"BookTrip4Me") produced a broad, speculative blueprint for a full agency back-office (queues, 5-role RBAC, lead intake, supplier payables). The user then supplied the actual authoritative spec: `doc/Flight Connect Travel Tech CRM PRD.pdf`, prepared by Rinnovar. **This PRD supersedes that speculation with a narrower, concrete scope.**

Key reframe from the PRD:
- The CRM starts **after** a customer has already agreed to purchase — quotation/booking-creation UX is explicitly **out of scope**. The PRD says "the booking module will already exist," but this repo currently has none (still the untouched `create-next-app` scaffold), so the platform phase below builds a **minimal** booking module just sufficient to hang the real workflow on — not a full itinerary/queue system.
- The real product is a **single booking screen** driving one linear pipeline: `Booking Created → Send Ticket Authorization → Customer Authorization Received → Create PayGlocal Payment Link → Send Booking Data to Risk Engine → Customer Makes Payment → Payment Status Updated Automatically → Upload Ticket → Send Ticket → Generate Invoice → Send Invoice → Booking Completed`, with every step logged to an Activity Timeline. This pipeline is **identical regardless of booking type** — only the "primary document" name/shape differs (e-ticket for flights, voucher for hotel/car, etc.), which is why the plan below builds the pipeline once and then activates booking types one at a time.
- Two named integrations: **PayGlocal** (payment-link creation) and **PayGlocal's Risk Engine** (fraud-risk data submission alongside link creation). The PRD explicitly requires this be built as a **configurable integration, not hardcoded**.
- Booking types named in the PRD: Flight, Hotel, Car Rental, Train, Cruise — each with a unique Booking ID. The PRD does not ask for the itinerary/segment/costing depth seen in the reference screenshots; those screenshots remain useful only as **visual inspiration** for a tabbed single-booking workspace, not as a feature spec. The user has now asked that each booking type be broken into its own delivery phase, since they carry distinct fields and document types even though the surrounding workflow is shared.

**Decisions confirmed with the user:**
- Build a minimal booking module ourselves (Booking, Customer, Passenger, booking type) as the foundation — since nothing exists to attach the PRD's workflow to otherwise.
- PayGlocal/Risk Engine: the user will supply real API docs/credentials, but hasn't pasted them yet. **Build the integration behind a swappable adapter interface with a mock implementation now; wire the real PayGlocal contract as a follow-up once the docs are provided** — this also satisfies the PRD's "configurable integrations, avoid hardcoding" requirement.
- Email sending: generic SMTP via Nodemailer (works with any provider, including Hostinger's own mailboxes; swappable via env vars).
- Roles: simple **Admin** + **Agent**.
- Stack: **Next.js 16** (App Router, Turbopack default; confirmed breaking changes in `node_modules/next/dist/docs` — async `params`, `middleware.ts` → `proxy.ts`), **MySQL** via **Sequelize** (Hostinger-friendly), real DB from day one.
- File storage default: local disk under an `/uploads` directory (env-configurable path), behind a swappable adapter.

---

## Database schema design & entity relationships (built once in Phase 0, used by every booking-type phase)

**Booking status pipeline** (identical for every booking type, drives the single-screen UI and is the allowed value set for `bookings.status`):
`created → auth_sent → authorized → payment_link_created → payment_received → primary_doc_uploaded → primary_doc_sent → invoiced → completed`.

### Entity-relationship diagram

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "agent_id"
    CUSTOMERS ||--o{ BOOKINGS : "customer_id"
    BOOKINGS ||--o{ PASSENGERS : "booking_id"
    BOOKINGS ||--o| FLIGHT_DETAILS : "booking_id (type=flight)"
    BOOKINGS ||--o| HOTEL_DETAILS : "booking_id (type=hotel)"
    BOOKINGS ||--o| CAR_DETAILS : "booking_id (type=car)"
    BOOKINGS ||--o| TRAIN_DETAILS : "booking_id (type=train)"
    BOOKINGS ||--o| CRUISE_DETAILS : "booking_id (type=cruise)"
    BOOKINGS ||--o| TICKET_AUTHORIZATIONS : "booking_id"
    BOOKINGS ||--o{ PAYMENT_LINKS : "booking_id"
    PAYMENT_LINKS ||--o{ RISK_ENGINE_SUBMISSIONS : "payment_link_id"
    PAYMENT_LINKS ||--o{ PAYMENTS : "payment_link_id"
    BOOKINGS ||--o{ PAYMENTS : "booking_id"
    BOOKINGS ||--o{ BOOKING_DOCUMENTS : "booking_id"
    USERS ||--o{ BOOKING_DOCUMENTS : "uploaded_by"
    BOOKINGS ||--o{ INVOICES : "booking_id"
    BOOKINGS ||--o{ EMAIL_LOGS : "booking_id"
    BOOKINGS ||--o{ ACTIVITY_TIMELINE_ENTRIES : "booking_id"
    USERS ||--o{ ACTIVITY_TIMELINE_ENTRIES : "actor_id"
    USERS ||--o{ USERS : "created_by"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role "admin|agent"
        bool is_active
        int created_by FK "nullable, self-ref to users.id"
        datetime created_at
    }
    CUSTOMERS {
        int id PK
        string name
        string email
        string phone
        datetime created_at
    }
    BOOKINGS {
        int id PK
        string booking_ref UK
        enum type "flight|hotel|car|train|cruise"
        int customer_id FK
        int agent_id FK
        enum status "pipeline stage"
        datetime created_at
        datetime updated_at
    }
    PASSENGERS {
        int id PK
        int booking_id FK
        string name
        date dob
        string passport_no "nullable"
    }
    FLIGHT_DETAILS {
        int id PK
        int booking_id FK_UK
        string pnr
        string airline
        string origin
        string destination
        date travel_date
    }
    HOTEL_DETAILS {
        int id PK
        int booking_id FK_UK
        string hotel_name
        string address
        date check_in
        date check_out
        string room_type
        string confirmation_no
    }
    CAR_DETAILS {
        int id PK
        int booking_id FK_UK
        string supplier
        string pickup_location
        datetime pickup_at
        string dropoff_location
        datetime dropoff_at
        string vehicle_type
        string confirmation_no
    }
    TRAIN_DETAILS {
        int id PK
        int booking_id FK_UK
        string train_number
        string route
        string class
        string confirmation_no
        date travel_date
    }
    CRUISE_DETAILS {
        int id PK
        int booking_id FK_UK
        string cruise_line
        string ship_name
        string itinerary
        string cabin_type
        date sail_date
        string confirmation_no
    }
    TICKET_AUTHORIZATIONS {
        int id PK
        int booking_id FK_UK
        datetime email_sent_at
        text email_body
        text customer_reply_text "nullable"
        datetime customer_reply_received_at "nullable"
        enum status "pending|authorized|declined"
    }
    PAYMENT_LINKS {
        int id PK
        int booking_id FK
        decimal amount
        string currency
        string gateway_provider
        string gateway_link_id
        string link_url
        enum status "created|expired|used|cancelled"
        datetime created_at
    }
    RISK_ENGINE_SUBMISSIONS {
        int id PK
        int booking_id FK
        int payment_link_id FK
        json payload_json
        datetime submitted_at
        json response_json
        string status
    }
    PAYMENTS {
        int id PK
        int booking_id FK
        int payment_link_id FK
        string transaction_id
        string gateway_reference_number
        decimal amount_paid
        string currency
        string payment_method
        datetime paid_at
        enum status "success|failed|pending"
    }
    BOOKING_DOCUMENTS {
        int id PK
        int booking_id FK
        enum doc_type "ticket|hotel_voucher|car_voucher|train_ticket|cruise_document|invoice|passport|visa|other"
        bool is_primary
        string file_url
        datetime uploaded_at
        int uploaded_by FK
    }
    INVOICES {
        int id PK
        int booking_id FK
        string invoice_no UK
        decimal amount
        string currency
        datetime generated_at
        string pdf_url
        datetime sent_at "nullable"
    }
    EMAIL_LOGS {
        int id PK
        int booking_id FK
        enum template_type "ticket_authorization|primary_document|invoice"
        string to_email
        string subject
        text body
        datetime sent_at
        enum status "sent|failed"
    }
    ACTIVITY_TIMELINE_ENTRIES {
        int id PK
        int booking_id FK
        enum event_type "auth_email_sent|auth_received|payment_link_created|payment_received|primary_doc_uploaded|primary_doc_sent|invoice_generated|invoice_sent"
        string description
        int actor_id FK "nullable, null = system-generated"
        datetime occurred_at
    }
```

### Relationship notes (cardinality + intent)
- `users (1) — bookings (N)` via `agent_id`: an agent owns many bookings; a booking has exactly one owning agent.
- `customers (1) — bookings (N)` via `customer_id`.
- `bookings (1) — passengers (N)`: a booking can carry multiple passengers (adult/child etc.), each passenger belongs to exactly one booking.
- `bookings (1) — {flight|hotel|car|train|cruise}_details (0..1)`: a **one-to-one** relationship enforced by a `UNIQUE` constraint on each detail table's `booking_id`. Only the detail table matching `bookings.type` is ever populated for a given booking — enforced at the service layer (not a DB-level polymorphic constraint, which MySQL doesn't support cleanly), so creating a booking of type `hotel` only ever inserts into `hotel_details`.
- `bookings (1) — ticket_authorizations (0..1)`: one current authorization record per booking; resend attempts update `email_sent_at` again rather than creating new rows (the history of each send is recorded separately in `email_logs`).
- `bookings (1) — payment_links (N)`: modeled as one-to-many, not one-to-one, because a link can expire or be recreated — the booking's *current* link is simply the most recent row by `created_at`.
- `payment_links (1) — risk_engine_submissions (N)` and `payment_links (1) — payments (N)`: both one-to-many off the link, to naturally capture retries/resubmissions and failed payment attempts, not just the eventual success.
- `bookings (1) — payments (N)`: a denormalized second FK straight to `bookings` (in addition to `payment_link_id`) purely so the booking screen's Payment tab and status derivation don't need a join through `payment_links` for the common read path.
- `bookings (1) — booking_documents (N)`, with `users (1) — booking_documents (N)` via `uploaded_by`: every uploaded file (primary document or supporting document) is one row; `is_primary` + `doc_type` distinguish the PRD's "Upload Ticket" step from ordinary supporting documents (passport, visa, etc.) without a separate `tickets` table.
- `bookings (1) — invoices (N)`: modeled as one-to-many to allow a reissue/credit-note later, even though Phase 1 only ever creates one.
- `bookings (1) — email_logs (N)`, `bookings (1) — activity_timeline_entries (N)`, with `users (1) — activity_timeline_entries (N)` via `actor_id` (nullable — null means the row was written by a system process, e.g. the payment webhook, not a human action).
- `users (1) — users (N)` via `created_by` (self-referential, nullable): tracks which Admin created a given Agent account, for the User Management screen's audit context; the first seeded Admin has `created_by = null`.

### Indexing & constraints
- Unique indexes: `users.email`, `bookings.booking_ref`, `invoices.invoice_no`, and `booking_id` on every `*_details` table (enforces the 1:1 relationship) and on `ticket_authorizations.booking_id`.
- Foreign key indexes on every `*_id` column above (Sequelize/MySQL default behavior when associations are declared) — critical for the booking screen's single-page load, which pulls every related table for one `booking_id`.
- Composite index on `activity_timeline_entries (booking_id, occurred_at)` for the Activity Timeline's chronological read.
- `payment_links.status`, `payments.status`, `ticket_authorizations.status` are narrow `ENUM` columns, not free text, so the pipeline's state machine can't drift into an invalid value.

### Sequelize association pattern
Each relationship above is declared once in `models/associations.ts` (not scattered per-model) using the standard Sequelize pairing — e.g. `Booking.hasMany(Passenger, { foreignKey: 'bookingId' })` / `Passenger.belongsTo(Booking)`, `Booking.hasOne(FlightDetail, { foreignKey: 'bookingId' })` for each type-detail table, `Booking.hasMany(PaymentLink)` → `PaymentLink.hasMany(Payment)` / `PaymentLink.hasMany(RiskEngineSubmission)`. Keeping all `.hasMany`/`.belongsTo`/`.hasOne` calls in one file makes the full relationship graph auditable in one place as new booking-type phases add their detail tables.

## Shared backend architecture (Phase 0)
- Layering: Server Components / Server Actions → `services/*.ts` (business logic + status transitions) → Sequelize models → MySQL.
- **Adapters** (PRD's "configurable integrations, avoid hardcoding" requirement):
  - `lib/payments/PaymentGatewayAdapter.ts` — interface: `createPaymentLink`, `submitToRiskEngine`, `verifyWebhookSignature`, `parseWebhookPayload`. `lib/payments/PayGlocalAdapter.ts` implements it, **mocked** until real docs arrive.
  - `lib/email/EmailAdapter.ts` — Nodemailer-backed, renders the 3 templates, every send writes `EmailLog` + `ActivityTimelineEntry`.
  - `lib/storage/FileStorageAdapter.ts` — `LocalDiskAdapter` default under `/uploads`.
- `app/api/payglocal/webhook/route.ts` — Route Handler (genuine external callback, not a Server Action); verifies signature, updates `Payment`, flips `Booking.status`, logs activity.
- `app/bookings/[bookingId]/page.tsx` — the single booking screen: **Overview**, **Ticket Authorization**, **Payment**, **Documents** (primary + supporting, label driven by `Booking.type`), **Invoice**, **Activity Timeline**. Built type-agnostically so no booking-type phase below needs to touch this file except to register a label/icon.
- `app/bookings/page.tsx` — list view: reference, customer, type, status, agent.
- **`app/login/page.tsx`** — the login screen: email/password form posting to a `login` Server Action (`app/login/actions.ts`) that verifies the password hash (`bcrypt`), creates a session, and sets an httpOnly cookie; on failure it re-renders the form with an inline error. `proxy.ts` redirects any unauthenticated request for `/bookings/*` or `/admin/*` to `/login`, and redirects an already-logged-in user away from `/login` to `/bookings`.
- **`app/admin/users/page.tsx`** — User Management screen, Admin-only (guarded both by `proxy.ts` route matching and a `can(user, 'user.manage')` check in its Server Actions, per the RBAC pattern below): lists all `users` (name, email, role, active, created_by), with an **"Add Agent"** action — a form/modal (`app/admin/users/actions.ts` → `createUser` Server Action) where the Admin enters name/email/temporary password and the account is created directly from the dashboard, no seed script or DB access required for routine onboarding. The same screen also supports creating additional Admins and deactivating a user (`is_active` flag) rather than hard-deleting, so historical `bookings.agent_id`/`booking_documents.uploaded_by` references stay intact.
- RBAC: `Admin` (manage users incl. adding Agents, full access to all bookings) / `Agent` (full workflow access on all bookings — PRD doesn't ask for ownership scoping). Enforced via a `can(user, action)` check in the service layer, not just conditional UI.

---

## Phased roadmap

### Phase 0 — Platform foundation (build once, no booking type is usable without it)
Auth incl. the **login screen** (`app/login`) and session handling, the **User Management screen** (`app/admin/users`) with its Admin-only "Add Agent" flow, the full shared data model above, the three adapters (mocked payment/risk-engine, real SMTP, local disk), the webhook route, the generic booking-list + single-booking-screen shell, and the `can()` RBAC guard. This phase is demoable on its own even before any booking type is activated: log in as a seeded Admin, add a new Agent from the dashboard, log in as that Agent — nothing booking-specific yet.

### Phase 1 — Flight module (first booking type activated)
- `FlightDetail` (one-to-one with `Booking`): PNR, airline, route summary (origin–destination), travel date. Kept light — not the full multi-segment model from the reference screenshots, since the PRD doesn't ask for itinerary depth.
- Primary document type = `ticket`; UI copy reads "Upload Ticket" / "Send Ticket" for this type.
- This phase is where the entire Phase 0 pipeline gets its first full, real exercise: authorization → mock payment link → mock risk-engine submission → mock webhook → ticket upload/send → invoice → activity timeline, all end-to-end on a flight booking.
- Seed: 1–2 demo flight bookings.
- **This is the phase that proves the platform works** — Phases 2–5 are additive and comparatively small once this is solid.

### Phase 2 — Hotel module
- `HotelDetail`: hotel name, address, check-in/out dates, room type, confirmation number.
- Primary document type = `hotel_voucher`; UI copy reads "Upload Hotel Voucher" / "Send Voucher".
- No changes to the shared pipeline, adapters, or booking-screen shell — only the new detail table, a booking-creation form for this type, and a label/icon registration.
- Seed: 1–2 demo hotel bookings; re-run the same Phase 1 end-to-end walkthrough against a hotel booking to confirm nothing type-specific leaked into the shared code.

### Phase 3 — Car Rental module
- `CarDetail`: supplier, pickup/dropoff location + datetime, vehicle type, confirmation number.
- Primary document type = `car_voucher`.
- Same pattern as Phase 2: new detail table + label registration only.

### Phase 4 — Train module
- `TrainDetail`: train number, route, class, confirmation number, travel date.
- Primary document type = `train_ticket`.

### Phase 5 — Cruise module
- `CruiseDetail`: cruise line, ship name, itinerary/route, cabin type, sail date, confirmation number.
- Primary document type = `cruise_document`.

### Phase 6 — Real PayGlocal + Risk Engine wiring (cross-cutting, whenever the user supplies docs/credentials)
- Swap `PayGlocalAdapter`'s mock implementation for the real API contract (link creation, risk-engine payload/endpoint, webhook signature verification) behind the same `PaymentGatewayAdapter` interface established in Phase 0 — no changes needed to any booking-type phase, since they only ever call the interface.

---

## Explicitly deferred / open items
- **Real PayGlocal + Risk Engine contract** — Phase 6, blocked on the user supplying actual API docs/credentials.
- **Inbound email parsing** to auto-detect a customer's authorization reply — the PRD says "customer replies to authorize," but an inbound-mail pipeline is a separate integration; every phase has the agent record the reply manually inside the CRM. Flagged as an assumption to confirm, not a silent scope cut.
- Booking creation/quotation UX beyond the minimal creation form each phase needs (explicitly out of scope per the PRD itself, which assumes bookings arrive already confirmed).
- Anything from the earlier speculative blueprint not restated here (queues, dead-queue/take-control locking, supplier payables, multi-currency ledger, customer self-service portal) — not part of this PRD, not built.

## Verification
1. **After Phase 0**: `npm run dev` boots, migrations run clean; visit `/login`, sign in as the one seeded Admin, confirm unauthenticated access to `/bookings` and `/admin/users` redirects to `/login`; from `/admin/users`, use **Add Agent** to create a new Agent account, then log out and log in as that new Agent to confirm the account works and has Agent-level (not Admin) access; `npm run lint` / `npx tsc --noEmit` pass.
2. **After Phase 1 (Flight)**: log in as the Agent created above, open a seeded flight booking, and walk the PRD's exact section-15 success-criteria list end-to-end using the mock adapters — send authorization → record customer reply → create payment link → confirm the Risk Engine payload was logged → fire the webhook (a script posting a signed mock payload to `/api/payglocal/webhook`) and confirm `Payment` + booking status update **automatically** → upload + send the ticket → generate + send an invoice → confirm the Activity Timeline shows all 8 events in order, each linked to real `EmailLog`/`Payment`/`BookingDocument` rows. Log in as Admin, confirm full visibility + user management.
3. **After each of Phases 2–5**: repeat the identical Phase 1 walkthrough against a seeded booking of that new type, confirming (a) the type-specific detail fields display correctly on the Overview tab, (b) the primary-document label/copy matches that type (voucher vs. ticket), and (c) no shared-pipeline code needed to branch on booking type to make it work.
4. **After Phase 6**: repeat the Phase 1 walkthrough once more against the real PayGlocal sandbox (not the mock), confirming the payment link, risk-engine submission, and webhook all work against the live API with no changes outside `PayGlocalAdapter.ts`.
5. `npm run lint` and `npx tsc --noEmit` after every phase, with attention to the async `params` pattern in `[bookingId]/page.tsx` and the webhook route handler's request typing.
