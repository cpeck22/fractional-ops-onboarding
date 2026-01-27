# Self-Serve Campaign Creation Workflow - Implementation Summary

## Overview

Implemented a universal self-serve campaign creation workflow that extends the existing `/client/outbound-campaigns` flow to ALL plays. Clients can now create production-ready campaigns through a guided 5-step process with built-in approval workflow.

## What Was Built

### 1. Database Schema (`supabase-campaigns-schema.sql`)

**Three new tables:**

- **`campaigns`** - Universal campaign table for all plays
  - Replaces `outbound_campaigns` for new campaigns
  - Stores campaign brief, intermediary outputs, runtime context, final outputs
  - Tracks list status and approval status
  - Auto-triggers email notifications via database triggers

- **`campaign_approvals`** - 3-stage approval tracking (List → Copy → Launch)
  - Records who approved, when, and any comments
  - Maintains audit log for compliance

- **`campaign_notifications`** - Email notification queue
  - Tracks notifications for list building, list review, and launch approval
  - Integrates with existing Zapier webhook

### 2. API Routes

**Universal Campaign Management:**
- `POST/GET /api/client/campaigns` - Create and list campaigns for any play

**Campaign Workflow Steps:**
- `POST /api/client/campaigns/[id]/intermediary` - Generate intermediary outputs using OpenAI
- `POST /api/client/campaigns/[id]/generate-copy` - Execute play agent with comprehensive runtime context
- `POST /api/client/campaigns/[id]/list-questions` - Answer list building questions
- `POST /api/client/campaigns/[id]/upload-list` - Upload CSV/XLSX list (admin only)
- `POST /api/client/campaigns/[id]/approve-list` - Client approves list preview
- `POST /api/client/campaigns/[id]/approve-copy` - Client approves/edits copy
- `GET /api/client/campaigns/[id]/preview-list` - Get sanitized list preview
- `POST /api/client/campaigns/[id]/send-notification` - Send email notifications

### 3. Frontend Pages

**Campaign Creation Flow:**
- `/client/[category]/[code]/new-campaign` - 5-step guided workflow
  - Step 1: Campaign Brief (meeting transcripts, email threads, documents)
  - Step 2: Additional Context (optional constraints and instructions)
  - Step 3: Intermediary Outputs Review (list instructions, hook, offer, asset, case studies)
  - Step 4: List Questions (do you have account/prospect lists ready?)
  - Step 5: Copy Review & Approval (editable copy with highlights)

**Approval Screens:**
- `/client/campaigns/[id]/approve-list` - List preview table (account, prospect, title only)
- `/client/campaigns/[id]/approve-copy` - Copy editor with highlighting
- `/client/campaigns` - Universal campaigns list with filters

**Play Page Enhancement:**
- Added "Create Full Campaign" button to all play execution pages

### 4. Supporting Libraries

**`lib/placeholder-validation.ts`** - New validation library
- Validates required placeholders ({{first_name}}, {{company_name}}, %signature%)
- Detects broken placeholder patterns
- Provides warnings for recommended tokens

## Key Features

### Production-Ready Copy on First Try

- Comprehensive runtime context passed to play agents includes:
  - Campaign brief (meeting transcripts, written strategy, documents)
  - Intermediary outputs (hook, offer, asset, case studies)
  - Octave workspace elements (personas, use cases, references)
  - Play-specific configuration
  - Conference-specific instructions (for plays 2009, 2010)

### Conference Play Special Handling

For conference plays (2009 pre-conference, 2010 post-conference):
- Generates copy that ties to event context
- Addresses buyer vs solution partner dynamic
- Includes conference-specific hook in first line
- Structures copy around "why they're attending"
- Includes CTA for 15-20 minute on-site meetings

### Highlighting Integration

- Uses existing `highlightOutput()` function
- Highlights applied immediately after copy generation
- Highlights persist in editable text areas
- Shows/hides highlights toggle for better editing experience
- Highlight legend included for clarity

### 3-Stage Approval Workflow

**List → Copy → Launch:**

1. **List Approval**
   - Admin uploads CSV/XLSX
   - Client previews only: account_name, prospect_name, job_title
   - Client approves to proceed

2. **Copy Approval**
   - Client reviews highlighted copy
   - Can edit directly in text area
   - Placeholder validation warns if tokens missing
   - Approval sets status to "Launch Approved"

3. **Launch Status**
   - Campaign is ready for execution
   - Solution architect notified via email

### Email Notifications

**Automated via database triggers:**

- **List building required** → emails sharifali1000@gmail.com with list instructions
- **List ready for review** → emails client to approve list
- **Launch approved** → emails sharifali1000@gmail.com that campaign is ready

## Workflow Diagram

```
Client Creates Campaign
         ↓
Step 1: Campaign Brief (meeting transcript, emails, docs)
         ↓
Step 2: Additional Context (optional constraints)
         ↓
Step 3: Intermediary Outputs Generated (OpenAI)
         ↓
Step 4: List Questions (do you have lists?)
         ↓
         ├─ Yes → Skip to Copy Generation
         └─ No → List building required
                 ↓
                 Email: sharifali1000@gmail.com
                 ↓
                 Admin uploads CSV/XLSX
                 ↓
                 Email: Client to review list
                 ↓
                 Client approves list
         ↓
Step 5: Copy Generation (Play Agent Execution)
         ↓
         Highlighting Applied Automatically
         ↓
         Client Reviews & Edits Copy
         ↓
         Client Approves Copy
         ↓
         Status: LAUNCH APPROVED
         ↓
         Email: sharifali1000@gmail.com
```

## Integration Points

### With Existing Systems

- **Octave API** - Calls play-specific Content Agents with runtime context
- **OpenAI API** - Generates intermediary outputs from campaign briefs
- **Highlighting System** - Uses existing `highlightOutput()` and `renderHighlightedContent()`
- **Authentication** - Uses existing `getAuthenticatedUser()` with impersonation support
- **Workspace API** - Fetches personas, use cases, references from Octave
- **Zapier Webhook** - Sends email notifications via existing webhook

### Backward Compatibility

- Existing `outbound_campaigns` table remains unchanged
- New `campaigns` table coexists with old system
- Migration can happen gradually per client
- All existing plays continue to work via quick execution flow
- New campaign flow is opt-in via "Create Full Campaign" button

## Testing Requirements

Before deployment, test:

1. Campaign creation for multiple play types (allbound, nurture, outbound, conference)
2. Intermediary outputs generation quality
3. Play agent execution with comprehensive runtime context
4. Highlighting in editable text areas
5. List upload and preview (CSV parsing)
6. Approval workflow (List → Copy → Launch)
7. Email notifications (verify Zapier webhook)
8. Placeholder validation warnings
9. Conference play special handling (2009, 2010)
10. Impersonation flow for admins

## Next Steps

1. Run database migration: `supabase-campaigns-schema.sql`
2. Test with one campaign (recommend play 2009 for conference context)
3. Verify email notifications work
4. Add XLSX parsing support (currently CSV only)
5. Implement file storage for uploaded lists (currently embedded in DB)
6. Add campaign editing capability (currently create-only)
7. Add campaigns list to navigation menu
8. Consider adding campaigns dashboard/analytics

## Files Created

**Database:**
- `supabase-campaigns-schema.sql`

**API Routes:**
- `app/api/client/campaigns/route.ts`
- `app/api/client/campaigns/[id]/intermediary/route.ts`
- `app/api/client/campaigns/[id]/generate-copy/route.ts`
- `app/api/client/campaigns/[id]/list-questions/route.ts`
- `app/api/client/campaigns/[id]/upload-list/route.ts`
- `app/api/client/campaigns/[id]/approve-list/route.ts`
- `app/api/client/campaigns/[id]/approve-copy/route.ts`
- `app/api/client/campaigns/[id]/preview-list/route.ts`
- `app/api/client/campaigns/[id]/send-notification/route.ts`

**Frontend:**
- `app/client/[category]/[code]/new-campaign/page.tsx`
- `app/client/[category]/[code]/new-campaign/new-campaign-content.tsx`
- `app/client/campaigns/page.tsx`
- `app/client/campaigns/campaigns-list-content.tsx`
- `app/client/campaigns/[id]/approve-list/page.tsx`
- `app/client/campaigns/[id]/approve-list/approve-list-content.tsx`
- `app/client/campaigns/[id]/approve-copy/page.tsx`
- `app/client/campaigns/[id]/approve-copy/approve-copy-content.tsx`

**Libraries:**
- `lib/placeholder-validation.ts`

**Files Modified:**
- `app/client/[category]/[code]/page.tsx` - Added "Create Full Campaign" button

## Architecture Decisions

1. **Separate campaigns table** - Allows gradual migration without breaking existing outbound_campaigns
2. **Database triggers for notifications** - Automatic, consistent, auditable
3. **OpenAI for intermediary generation** - Faster, cheaper than Octave for structured extraction
4. **Octave for final copy** - Leverages existing play agents and workspace context
5. **Inline highlighting** - Uses existing system, no new infrastructure needed
6. **CSV-first for lists** - Simpler implementation, XLSX can be added later
7. **Embedded file storage** - Quick implementation, can migrate to S3/Supabase Storage later

## Success Metrics

- Campaign creation time: < 5 minutes (vs 30+ minutes manual)
- Copy approval rate: > 90% (production-ready on first try)
- List building time: < 24 hours (automated workflow)
- Client satisfaction: Self-serve reduces back-and-forth
- Highlighting accuracy: > 95% (existing system proven)

## Support Contacts

- **Technical Issues**: ali.hassan@fractionalops.com
- **Campaign Strategy**: corey@fractionalops.com
- **List Building**: sharifali1000@gmail.com
