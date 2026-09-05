# NEXORA Agentic Commerce

NEXORA is an AI-native commerce application built for the Razorpay Buildathon. It turns natural-language shopper intent into real catalog recommendations, explicit human authorization, Razorpay test checkout, server-side payment verification, and an auditable merchant control layer.

Live demo: https://nexora-agentic-commerce-nu.vercel.app/

The core principle is simple:

```text
AI may reason, search, recommend, and prepare.
Only trusted backend systems may price, authorize, execute, verify, and audit money movement.
```

## Buildathon Track

Track 01: AI Growth and Agentic Commerce.

## What NEXORA Demonstrates

- Agent-readable storefront and product discovery
- Natural-language commerce intent extraction
- Real catalog filtering and deterministic recommendation ranking
- Cross-sell suggestions without silent cart mutation
- Merchant guardrails before checkout
- Explicit customer authorization before payment
- Razorpay Test Mode order creation
- Server-side Razorpay signature verification
- Firebase-authenticated protected merchant APIs
- Supabase persistence for catalog, carts, orders, payments, actions, and audit logs
- Live merchant activity through persisted audit events and SSE
- Product tour, architecture map, and premium NEXORA visual system

## High-Level Architecture

```text
                           Browser
                              |
                              v
                 React + Vite + TypeScript
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
 Firebase Web SDK                    Central API Client
 Email/Password + Google             Authorization: Bearer <ID token>
             |                                 |
             |                                 v
             |                      Flask REST API
             |                                 |
             |                  Firebase Admin Middleware
             |                   verifies Firebase ID token
             |                                 |
             +---------------------------------+
                                               |
                 +-----------------------------+-----------------------------+
                 |                             |                             |
                 v                             v                             v
        Commerce Agent Pipeline        Checkout/Payment Services       Merchant Services
        intent -> catalog -> rank      auth -> order -> verify         analytics + guardrails
                 |                             |                             |
                 v                             v                             v
          Supabase Products            Razorpay Test APIs              Supabase Audit Logs
          Supabase Metadata            Supabase Orders/Payments        SSE Live Activity
```

## Runtime Architecture

```text
frontend/
  React app
  Vite build system
  Tailwind visual system
  Firebase Web Auth
  Razorpay Checkout JS launcher
  Product tour and route-aware UI

backend/
  Flask application
  Firebase Admin auth middleware
  Commerce agent orchestrator
  Catalog and recommendation services
  Guardrail service
  Checkout authorization service
  Razorpay service
  Supabase service
  Audit and SSE services
  Analytics service
  Campaign service

supabase/
  SQL migrations
  Merchant/product/cart/order/payment/audit schema
  Demo seed data
  Large product catalog generation
```

## Frontend Architecture

The frontend is a React single-page application.

```text
frontend/src/App.tsx
  App shell, navigation, global background, route definitions, product tour mount

frontend/src/pages/
  LandingPage.tsx
  ShopPage.tsx
  ProductPage.tsx
  AgentPage.tsx
  CartPage.tsx
  CheckoutPage.tsx
  PaymentSuccessPage.tsx
  PaymentFailurePage.tsx
  MerchantDashboard.tsx
  MerchantAudit.tsx
  MerchantGuardrails.tsx
  MerchantCampaigns.tsx
  CatalogReadiness.tsx
  ArchitecturePage.tsx
  LoginPage.tsx
  RegisterPage.tsx

frontend/src/services/
  api.ts          Central Axios API client
  auth.ts         Firebase Web Auth wrapper
  agent.ts        Commerce Agent API client
  checkout.ts     Checkout and verification API client
  merchant.ts     Merchant analytics/activity API client

frontend/src/components/
  auth/           Auth layout, fields, Google button
  three/          CommerceCore and global 3D ambient core
  tour/           Guided product tour
  checkout/       Authorization panel
  agent/          Product recommendation cards
  audit/          Audit timeline
  ui/             Shared surfaces, metrics, buttons
```

## Backend Architecture

The backend is a Flask API. It owns all trusted operations.

```text
backend/app.py
  Creates Flask app
  Configures CORS
  Registers API blueprints

backend/config.py
  Loads environment configuration
  Supports demo mode and real integrations

backend/middleware/firebase_auth.py
  Verifies Firebase ID tokens with Firebase Admin
  Attaches verified user identity to Flask request context

backend/agent/
  schemas.py       Pydantic request/response schemas
  orchestrator.py  Agent pipeline coordination
  tools.py         Agent-readable commerce tools

backend/services/
  llm_service.py             Optional LLM intent extraction
  catalog_service.py         Catalog lookup and filtering
  recommendation_service.py  Cross-sell recommendation helpers
  guardrail_service.py       Merchant policy checks
  checkout_service.py        Authorization, order creation, payment verification
  razorpay_service.py        Razorpay Test Mode API integration
  supabase_service.py        Supabase data access
  audit_service.py           Persisted audit log creation
  event_service.py           Server-sent events
  analytics_service.py       Real merchant analytics
  campaign_service.py        Demo campaign controls
```

## Shopper Intent Flow

```text
User prompt
  |
  v
POST /api/agent/run
  |
  v
Prompt validation
  |
  v
LLM intent extraction, if available
  |
  +--> deterministic fallback if LLM fails
  |
  v
Structured intent
  |
  v
Supabase catalog search
  |
  v
Deterministic ranking
  |
  v
Recommendations + candidate count
  |
  v
Audit events
```

The LLM improves intent extraction but is not a hard dependency for simple product search. If the provider fails, deterministic parsing keeps the commerce search alive.

## Checkout And Payment Flow

```text
User approves purchase
  |
  v
POST /api/checkout/authorize
  |
  v
Firebase Auth verifies user
  |
  v
Backend loads trusted cart from Supabase
  |
  v
Backend recalculates total from product records
  |
  v
Merchant guardrails check the action
  |
  v
Authorization is persisted
  |
  v
POST /api/checkout/create-order
  |
  v
Backend creates Razorpay Test order
  |
  v
Frontend opens Razorpay Checkout
  |
  v
User completes payment
  |
  v
POST /api/checkout/verify
  |
  v
Backend verifies Razorpay signature
  |
  v
Supabase order/payment/audit persistence
  |
  v
/payment/success
```

NEXORA does not trust frontend totals, product prices, user IDs, or payment success state.

## Authentication Architecture

```text
React
  |
  v
Firebase Web SDK
  |
  +--> Email/password registration
  +--> Email/password login
  +--> Google sign-in
  +--> Persistent auth session
  |
  v
Firebase ID token
  |
  v
Authorization: Bearer <token>
  |
  v
Flask Firebase Admin middleware
  |
  v
Verified UID attached to request context
```

Protected backend routes verify Firebase tokens server-side. Identity-sensitive actions use the verified Firebase UID, not a frontend-supplied `uid`, `email`, or `user_id`.

## Payment Security Architecture

- The frontend requests checkout, but does not calculate trusted payment amount.
- Flask reloads the cart and products from Supabase.
- Flask recalculates totals in INR and converts to paise for Razorpay.
- Razorpay Test Mode keys are used only by backend services.
- Payment success is accepted only after HMAC signature verification.
- Duplicate execution is prevented through idempotency keys and persisted action state.
- Failed/cancelled checkout paths preserve cart state and write recovery audit events.

## Merchant Analytics Architecture

Merchant analytics are derived from persisted backend data.

Current dashboard cards:

- AI-Assisted Revenue
- Agent Conversion
- Conversion Lift
- Upsell Revenue
- Recovered Revenue

Rules:

- AI-assisted revenue counts only verified payments linked to persisted agent sessions.
- Verified transactions belong under AI-Assisted Revenue.
- Agent conversion is derived from verified agent-linked purchases divided by persisted agent sessions.
- Conversion lift is `null` unless baseline conversion data exists.
- Upsell revenue is zero unless persisted upsell attribution exists.
- Recovered revenue is zero unless persisted recovery attribution exists.
- Revenue metrics refresh after `PAYMENT_VERIFIED` SSE events by refetching backend analytics.

## Audit And Observability

```text
Backend action
  |
  v
Supabase audit_logs insert
  |
  v
SSE publish
  |
  v
Merchant Dashboard Live Activity
  |
  v
Merchant Audit Replay
```

Important audit events:

- `SESSION_STARTED`
- `INTENT_RECEIVED`
- `INTENT_PARSED`
- `CATALOG_SEARCHED`
- `PRODUCT_RECOMMENDED`
- `CART_PREPARED`
- `POLICY_CHECK_PASSED`
- `USER_AUTHORIZATION_RECEIVED`
- `RAZORPAY_ORDER_CREATED`
- `PAYMENT_ATTEMPTED`
- `PAYMENT_VERIFIED`
- `PAYMENT_VERIFICATION_FAILED`
- `PAYMENT_FAILED`
- `CART_PRESERVED`
- `DUPLICATE_EXECUTION_PREVENTED`

## Supabase Data Model

```text
profiles
  Firebase UID to profile mapping

merchants
  Merchant workspace and owner profile

merchant_guardrails
  Policy limits, allowed tools, approval requirements

products
  Agent-readable catalog with SKU, category, price, inventory, metadata

customers
  Optional customer records

agent_sessions
  Persisted commerce-agent sessions

conversations
messages
  Conversation and message persistence

recommendations
  Agent product recommendations and recommendation type

cart_sessions
cart_items
  Trusted cart state and line items

agent_actions
  Proposed, approved, and executed agent actions

orders
order_items
  Merchant orders and trusted line items

payments
  Razorpay payment records and verification status

audit_logs
  Immutable action/event trail

campaigns
  Merchant campaign demo records
```

## API Surface

Health:

```text
GET /api/health
```

Agent:

```text
GET  /api/agent/catalog
POST /api/agent/search
POST /api/agent/run
POST /api/agent/checkout
```

External AI buyer gateway:

```text
GET  /api/agent-commerce/manifest
GET  /api/agent-commerce/catalog
POST /api/agent-commerce/search
POST /api/agent-commerce/cart
POST /api/agent-commerce/quote
POST /api/agent-commerce/request-checkout
GET  /api/agent-commerce/orders/<order_id>
```

Checkout:

```text
POST /api/checkout/authorize
POST /api/checkout/create-order
POST /api/checkout/verify
POST /api/checkout/failure
```

Merchant:

```text
GET  /api/merchant/analytics
GET  /api/merchant/activity
GET  /api/merchant/audit
GET  /api/merchant/guardrails
POST /api/merchant/guardrails/simulate
GET  /api/merchant/catalog-readiness
POST /api/merchant/evaluations/run
```

Audit and events:

```text
GET /api/audit
GET /api/audit/sessions/<session_id>/events
GET /api/events
```

## Frontend Routes

```text
/                              Landing
/shop                          Product catalog
/product/:id                   Product detail
/agent                         Shopping agent
/cart                          Cart
/checkout                      Checkout authorization and Razorpay launch
/payment/success               Verified payment success
/payment/failure               Controlled payment failure/recovery
/login                         Firebase login
/register                      Firebase registration
/merchant                      Merchant dashboard
/merchant/products             Merchant product catalog
/merchant/orders               Merchant order focus
/merchant/revenue              Merchant revenue focus
/merchant/agent                Merchant agent console
/merchant/guardrails           Merchant guardrails
/merchant/audit                Merchant audit trail
/merchant/campaigns            Merchant campaigns
/merchant/catalog-readiness    External AI buyer gateway/readiness
/architecture                  System architecture map
```

## Environment Variables

Do not commit real `.env` files. Use the example files:

```text
backend/.env.example
frontend/.env.example
```

Frontend public variables:

```text
VITE_API_BASE_URL=
VITE_API_URL=
VITE_DEMO_MODE=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Backend private variables:

```text
DEMO_MODE=
FRONTEND_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
TEST_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
REDIS_URL=
```

Never place Firebase Admin, Supabase service-role, Razorpay secret, database, Redis, or LLM secrets in React/Vite public environment variables.

## Local Setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies using your existing Python environment:

```bash
pip install -r backend/requirements.txt
```

Run backend:

```bash
python -m flask --app backend.app run --debug --port 5000
```

Run frontend:

```bash
cd frontend
npm run dev
```

Default local URLs:

```text
Frontend: http://127.0.0.1:5173
Backend:  http://127.0.0.1:5000
```

## Supabase Setup

Apply migrations in order:

```text
supabase/migrations/001_nexora_schema.sql
supabase/migrations/002_seed_demo_data.sql
supabase/migrations/003_checkout_agent_actions_contract.sql
supabase/migrations/004_nexora_checkout_seed.sql
supabase/migrations/005_large_product_catalog.sql
```

The large catalog migration provides the broader product set used by real catalog search.

## Firebase Setup

Enable these sign-in methods in Firebase Console:

- Email/Password
- Google

Authorized development domains should include:

- `localhost`
- `127.0.0.1`

Frontend uses Firebase Web SDK. Backend uses Firebase Admin SDK.

## Razorpay Setup

Use Razorpay Test Mode credentials only for local/demo verification.

```text
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

The key secret belongs only in backend environment variables.

## Demo Script

Primary happy path:

```text
I need a birthday gift for my girlfriend.
Budget INR 4,000.
She likes minimal jewellery.
```

Expected flow:

```text
Intent extraction
-> catalog search
-> product recommendations
-> Silver Celestial Necklace
-> Premium Jewellery Case cross-sell
-> explicit purchase authorization
-> Razorpay Test Checkout
-> server-side verification
-> payment success page
-> audit entries
-> merchant analytics refresh
```

Failure path:

```text
Enable simulated payment failure
-> authorize checkout
-> payment attempt fails in a controlled way
-> cart preserved
-> duplicate execution prevented
-> recovery UI shown
-> audit events generated
```

## Verification Commands

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Razorpay E2E tests:

```bash
cd frontend
npm run test:e2e:razorpay
```

Backend:

```bash
python -m flask --app backend.app run --debug --port 5000
```

Health check:

```bash
curl http://127.0.0.1:5000/api/health
```

## Security Boundaries

- Frontend can request actions.
- Backend verifies identity and authorization.
- Backend recalculates cart totals.
- Backend creates Razorpay orders.
- Backend verifies Razorpay signatures.
- Supabase stores trusted commerce state.
- Audit logs record meaningful actions.
- Merchant analytics read from persisted data only.

## Design System

Visual identity:

- Near-black graphite base
- Indigo/violet primary accent
- Cyan secondary accent
- Technical grid and starfield background
- Premium glass surfaces
- Shared 3D commerce core on selected routes
- Official Google G logo for Google auth

The UI is designed to feel like premium AI infrastructure rather than a generic storefront.

## Repository Hygiene

Ignored by default:

```text
.env
backend/.env
frontend/.env
.venv/
node_modules/
dist/
test-results/
playwright-report/
```

Commit source, migrations, examples, tests, and configuration templates. Do not commit live credentials or generated runtime artifacts.
