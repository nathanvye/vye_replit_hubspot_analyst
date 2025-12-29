# Vye Agency Intelligence

## Overview

This is an AI-powered HubSpot analysis and insights application for Vye Agency. The platform allows agency staff to connect their HubSpot accounts, have conversational AI interactions to analyze CRM data, and generate business intelligence reports.

The application is a full-stack TypeScript project with a React frontend and Express backend, using PostgreSQL for data persistence and OpenAI for AI-powered analysis capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Session Management**: Express sessions (prepared for connect-pg-simple)

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Drizzle Kit with `db:push` command
- **Key Entities**:
  - Users (authenticated vye.agency email users)
  - HubSpot Accounts (encrypted API keys, portal info)
  - Conversations (chat sessions per account)
  - Messages (conversation history)
  - Learned Context (custom terminology per account)
  - Reports (generated analysis documents)

### Authentication
- Email-based authentication restricted to `@vye.agency` domain
- No password required (internal tool assumption)
- Session-based auth with user context stored in React Context

### Security
- HubSpot API keys encrypted at rest using AES-256-GCM
- Encryption key derived from environment variable
- API key validation against HubSpot API before storage

### AI Integration
- OpenAI API for conversational analysis
- Configurable via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Supports learned context - users can teach the AI custom terminology
- Conversation history maintained for context continuity

### Build System
- Development: Vite dev server with HMR on port 5000
- Production: Custom build script using esbuild for server, Vite for client
- Server bundles select dependencies to optimize cold start times

## External Dependencies

### Third-Party Services
- **HubSpot API**: CRM data access via `@hubspot/api-client` - requires Private App access tokens
- **OpenAI API**: AI analysis and natural language processing

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL (optional, for custom endpoints)
- `ENCRYPTION_KEY` or `SESSION_SECRET` - Used for encrypting stored API keys

### HubSpot Private App Required Scopes
For full functionality, ensure your HubSpot Private App has these scopes enabled:
- `crm.objects.contacts.read` - Read contacts
- `crm.objects.deals.read` - Read deals
- `crm.objects.companies.read` - Read companies
- `crm.schemas.deals.read` - Read deal pipelines/stages
- `forms` - Read form submissions
- `reports` - Read reports (required for website sessions)

### Website Sessions Configuration
Website sessions use the HubSpot Analytics API v2.

**How it works:**
1. For each quarter, the app calls `GET /analytics/v2/reports/totals/total?start=YYYYMMDD&end=YYYYMMDD`
2. It extracts the `sessions` value from the response
3. Values are summed per quarter for the selected year

**Requirements:**
- HubSpot Marketing Hub subscription may be required for Analytics API access
- If sessions show 0, check server logs for API error messages

**Troubleshooting:**
- If sessions always show 0, the Analytics API may not be available for your HubSpot subscription
- The KPI table will show a warning message if sessions data is unavailable