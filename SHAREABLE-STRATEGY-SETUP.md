# Shareable Strategy Feature - Setup Guide

## 🎯 Feature Overview

This feature allows users to create shareable links for their strategies with a 14-day expiration timer. Once shared, the strategy becomes publicly viewable without requiring login.

## 📋 Setup Checklist

### 1. **Run Supabase Migration**

Execute the SQL migration to create the `shared_strategies` table:

```bash
# In your Supabase SQL Editor, run:
supabase-shared-strategies.sql
```

This creates:
- `shared_strategies` table
- RLS policies for public read access
- Indexes for fast lookups
- Policy updates for `octave_outputs` table

### 2. **Verify Environment Variables**

Ensure you have these environment variables set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. **Deploy to Vercel**

```bash
git add .
git commit -m "Add shareable strategy feature with 14-day expiration timer"
git push origin main
```

Vercel will auto-deploy.

## 🎨 How It Works

### User Flow:

1. **User views `/results` page**
   - Sees "Share Strategy" button in header

2. **User clicks "Share Strategy"**
   - System creates unique shareable link: `/share-claire-strategy/[shareId]`
   - Link is copied to clipboard automatically
   - Button is replaced with 14-day countdown timer

3. **User shares link with team/prospects**
   - Link is publicly accessible (no login required)
   - Shows exact same content as `/results` page
   - Displays countdown timer at top

4. **Timer expires after 14 days**
   - Link shows "Strategy Expired" message
   - User is prompted to book a GTM Kickoff Call

### Technical Details:

- **Database**: New `shared_strategies` table stores share links
- **Unique Constraint**: One share link per user (no duplicates)
- **RLS Policies**: Public read access for active shares only
- **Timer**: Client-side countdown with server-side validation
- **Soft Delete**: Data persists in database, just marked as expired

## 🎨 Timer Color Logic

Based on CEO's vision from screenshots:

- **14-11 days**: Black background (`bg-gray-900`), green diamond
- **10-6 days**: Orange background (`bg-orange-500`), orange diamond
- **5-0 days**: Red background (`bg-red-600`), red diamond

## 🔗 CTA Button

"Upgrade now and add to your CRM" → Links to:
```
https://meetings.hubspot.com/corey-peck/gtm-kickoff-call
```

## 📁 Files Created/Modified

### Created:
1. `supabase-shared-strategies.sql` - Database migration
2. `components/StrategyTimer.tsx` - Countdown timer component
3. `app/api/share-strategy/route.ts` - API to create share links
4. `app/share-claire-strategy/[shareId]/page.tsx` - Public share page

### Modified:
1. `app/results/page.tsx` - Added share button + timer logic

## 🧪 Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] User can click "Share Strategy" button
- [ ] Share link is copied to clipboard
- [ ] Timer appears after sharing (replaces button)
- [ ] Shareable link loads without login
- [ ] Timer displays correct colors (14-11=black, 10-6=orange, 5-0=red)
- [ ] CTA button links to HubSpot meeting
- [ ] Expired link shows "Strategy Expired" message
- [ ] User can only create ONE share link (no duplicates)

## 🚀 Deployment

1. **Run SQL migration in Supabase SQL Editor**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add shareable strategy feature with 14-day timer"
   git push origin main
   ```
3. **Verify on Vercel** - Deploy should complete automatically

## 🎉 Result

Your prospects/clients can now:
- ✅ Share their strategy with team members
- ✅ View strategy without creating an account
- ✅ See 14-day countdown timer
- ✅ Be prompted to "Add to CRM" before expiration

This creates **urgency** and drives conversions! 💎

