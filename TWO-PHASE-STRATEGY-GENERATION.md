# Two-Phase Strategy Generation

## Overview

This document describes the **two-phase strategy generation** implementation that prevents Vercel timeouts by splitting the process into two sequential API calls.

## Problem

The original single-phase strategy generation was timing out after 5 minutes (Vercel limit) because:

- **AI Company Generation**: ~15s
- **Prospecting 47 companies**: ~90s
- **Enriching 99 prospects**: ~120s  
- **Generating 13 content agents**: ~130s
- **Total**: ~375s (6.25 minutes) ❌ **TIMEOUT**

## Solution

Split into two phases, each under 5 minutes:

### Phase 1: Data Generation (4 minutes)
**Route**: `/api/octave/generate-strategy`

1. List agents in workspace
2. Extract persona job titles
3. Load ICP data from questionnaire
4. Generate ICP-matching companies with AI (50 domains)
5. Run Prospector Agent across all companies
6. Enrich prospects with LeadMagic (99 prospects, batch of 10)
7. **Save prospects + agent IDs to database**

**Returns**: `{ success: true, phase: 1, prospectCount, emailsFound, mobilesFound }`

### Phase 2: Content Generation (2.3 minutes)
**Route**: `/api/octave/generate-strategy-content`

1. Load prospects + agent IDs from database
2. Generate Cold Email sequences (5 agents)
3. Generate LinkedIn Posts (3 agents)
4. Generate LinkedIn DMs (2 agents)
5. Generate Newsletters (2 agents)
6. Generate Call Prep (1 agent)
7. **Save all content to database**

**Returns**: `{ success: true, phase: 2, results: {...} }`

## Architecture

```
Frontend (/thank-you)
    ↓
    ├─→ Phase 1: /api/octave/generate-strategy
    │       ↓
    │       Save: prospects + _agent_ids
    │       ↓
    │       Return: { success, prospectCount }
    ↓
    ├─→ Phase 2: /api/octave/generate-strategy-content
    │       ↓
    │       Load: prospects + _agent_ids
    │       ↓
    │       Generate all content
    │       ↓
    │       Save: cold_emails, linkedin_posts, etc.
    │       ↓
    │       Return: { success, results }
    ↓
Open /results page
```

## Database Schema

New columns added to `octave_outputs`:

```sql
_agent_ids JSONB          -- Stores agent IDs from Phase 1
_company_domain TEXT       -- Company domain for content generation
_company_name TEXT         -- Company name for content generation
```

## Files Modified

### Backend
1. **`/app/api/octave/generate-strategy/route.ts`**
   - Removed content generation (Steps 7-15)
   - Saves only prospects + metadata
   - Returns after Phase 1 completion

2. **`/app/api/octave/generate-strategy-content/route.ts`** (NEW)
   - Loads Phase 1 data from database
   - Runs all content generation agents
   - Saves content results

### Frontend
3. **`/app/thank-you/page.tsx`**
   - Calls Phase 1, waits for completion
   - Calls Phase 2, waits for completion
   - Shows seamless loading modal
   - Updated progress messaging

### Database
4. **`supabase-add-phase-metadata.sql`** (NEW)
   - Adds `_agent_ids`, `_company_domain`, `_company_name` columns

## Setup Instructions

### 1. Run Supabase Migration

In Supabase SQL Editor:

```sql
-- Run: supabase-add-phase-metadata.sql
ALTER TABLE public.octave_outputs
ADD COLUMN IF NOT EXISTS _agent_ids JSONB,
ADD COLUMN IF NOT EXISTS _company_domain TEXT,
ADD COLUMN IF NOT EXISTS _company_name TEXT;
```

### 2. Deploy to Vercel

```bash
git add -A
git commit -m "feat: Implement two-phase strategy generation to prevent timeouts"
git push origin main
```

Vercel will auto-deploy.

### 3. Test End-to-End

1. Go to `/thank-you` page
2. Click "Build My Plan Now"
3. **Phase 1** runs (~4 min):
   - "Phase 1: Finding prospects and enriching contacts..."
   - Progress bar goes to 50%
4. **Phase 2** starts automatically (~2 min):
   - "Phase 2: Generating personalized content..."
   - Progress bar goes from 50% → 100%
5. Results page opens automatically

## Testing Checklist

- [ ] Phase 1 completes under 5 minutes
- [ ] Phase 2 starts automatically after Phase 1
- [ ] Phase 2 completes under 5 minutes
- [ ] Progress modal shows both phases
- [ ] Results page displays all content
- [ ] No Vercel timeout errors

## Expected Timings

| Phase | Duration | Timeout Risk |
|-------|----------|--------------|
| Phase 1 | ~240s (4 min) | ✅ SAFE |
| Phase 2 | ~140s (2.3 min) | ✅ SAFE |
| **Total** | ~380s (6.3 min) | ✅ SAFE (split) |

## Error Handling

### Phase 1 Fails
- **User Experience**: Error alert, can retry
- **Data State**: No changes to database
- **Action**: Fix issue, retry

### Phase 2 Fails
- **User Experience**: Warning alert (non-critical)
- **Data State**: Prospects already saved ✅
- **Action**: User can view prospects on `/results`, retry content generation manually

## Benefits

✅ **No Timeouts**: Each phase under 5 minutes  
✅ **Proven Pattern**: Same as workspace submission  
✅ **Graceful Degradation**: Phase 1 success = partial results  
✅ **User Experience**: Seamless loading modal  
✅ **Maintainable**: Clear separation of concerns  

## Monitoring

Check Vercel logs for:

```
🎯 ===== PHASE 1 COMPLETE =====
   Prospects: SAVED
   Agent IDs: SAVED

🎯 ===== PHASE 2 COMPLETE =====
   Cold Emails: SAVED
   LinkedIn Posts: SAVED
   ...
```

## Rollback Plan

If issues arise, revert to single-phase:

1. Restore original `generate-strategy/route.ts`
2. Delete `generate-strategy-content/` directory
3. Revert `/thank-you/page.tsx` changes

## Related Documents

- `TWO-PHASE-WORKSPACE-IMPLEMENTATION.md` - Original two-phase pattern
- `AI-POWERED-PROSPECTING.md` - AI company generation
- `VERCEL-DEPLOYMENT.md` - Deployment guide

---

**Implementation Date**: November 28, 2025  
**Pattern**: Two-Phase API Workflow  
**Status**: ✅ Ready for Production

