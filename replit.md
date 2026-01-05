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
- **Google SSO**: Primary authentication via Google OAuth 2.0
  - Restricted to `@vye.agency` domain only
  - Uses Passport.js with passport-google-oauth20 strategy
  - Requires Google Cloud Console OAuth credentials
- **Email fallback**: Simple email-based login (no password)
- Session-based auth with express-session middleware
- User context stored in React Context with session restoration

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
- **Google Analytics Data API**: Page view and traffic channel tracking (optional)

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL (optional, for custom endpoints)
- `SESSION_SECRET` - Used for session encryption
- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 Client Secret
- `ENCRYPTION_KEY` - Used for encrypting stored HubSpot API keys (falls back to SESSION_SECRET)
- `GOOGLE_SERVICE_ACCOUNT_KEY` - (Optional) JSON service account key for Google Analytics Data API
- `GBP_CLIENT_ID` - (Optional) Google Business Profile OAuth Client ID
- `GBP_CLIENT_SECRET` - (Optional) Google Business Profile OAuth Client Secret

### Google Analytics Integration (Optional)

To enable Google Analytics page view and traffic channel tracking:

1. **Create a Service Account** in Google Cloud Console:
   - Go to APIs & Services → Credentials → Create Credentials → Service Account
   - Enable the "Google Analytics Data API" in APIs & Services → Library
   
2. **Grant Access in Google Analytics**:
   - In GA4: Admin → Property → Property Access Management
   - Add the service account email (from step 1) with "Viewer" role
   
3. **Configure the Environment Variable**:
   - Copy the service account JSON key
   - Set `GOOGLE_SERVICE_ACCOUNT_KEY` to the full JSON content (escaped as needed)
   
4. **Configure Property ID** in Settings:
   - Find your GA4 Property ID: Admin → Property Settings → Property ID (numeric ID like `123456789`)
   - Enter it in Settings → Google Analytics

The integration provides:
- Quarterly page view counts
- Traffic channel group breakdown (with pie chart visualization)

### HubSpot Private App Required Scopes
For full functionality, ensure your HubSpot Private App has these scopes enabled:
- `crm.objects.contacts.read` - Read contacts
- `crm.objects.deals.read` - Read deals
- `crm.objects.companies.read` - Read companies
- `crm.schemas.deals.read` - Read deal pipelines/stages
- `forms` - Read form submissions
- `reports` - Read reports (required for website sessions)

### Website Sessions Configuration
Website sessions use the HubSpot Reports API v2.

**How it works:**
1. `GET https://api.hubapi.com/reports/v2/reports` - Lists available reports, finds traffic report
2. `POST https://api.hubapi.com/reports/v2/reports/{REPORT_ID}/data` - Runs report with date range per quarter
3. Sums all values from the `data` array in response

**Requirements:**
- Private App needs appropriate scopes for Reports API
- A traffic/sessions report must exist in your HubSpot account

**Troubleshooting:**
- Check server logs for the list of available reports and API response details
- If no reports are found, you may need to create a sessions report in HubSpot first

### Google Business Profile Integration (Optional)

To enable Google Business Profile data in reports (ratings, reviews, business details):

1. **Create OAuth 2.0 Credentials** in Google Cloud Console:
   - Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Add authorized redirect URI: `https://your-domain/api/google-business-profile/callback`
   - Enable the "My Business Business Information API" in APIs & Services → Library

2. **Configure Environment Variables**:
   - Set `GBP_CLIENT_ID` to your OAuth Client ID
   - Set `GBP_CLIENT_SECRET` to your OAuth Client Secret

3. **Connect in Settings**:
   - Go to Settings → Google Business Profile
   - Click "Connect Google Business Profile"
   - Sign in with a Google account that has Owner/Manager access to the business listing
   - Select the business location to connect

The integration provides:
- Business name and address
- Star rating and total review count
- Business categories
- Phone number and website
- Business hours
- Link to Google Maps listing

**Note**: The business must be verified on Google for the integration to work.