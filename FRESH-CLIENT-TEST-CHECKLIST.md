# Fresh Client Test Checklist

## 🔧 Pre-Test Setup

### 1. **Run Supabase Migration (CRITICAL!)**
```sql
-- In Supabase SQL Editor, run:
supabase-shared-strategies.sql
```

**This creates the `shared_strategies` table needed for the share feature.**

---

## ✅ Full User Flow Test

### Phase 1: Questionnaire & Workspace Creation

- [ ] **Navigate to homepage** - Video loads at top
- [ ] **Sign up / Sign in** - Authentication works
- [ ] **Complete questionnaire** (all 10 sections)
  - [ ] Section videos load properly
  - [ ] Answers save between sections
  - [ ] Q19, Q20, Q21 (arrays) save correctly
- [ ] **Review page** - All answers displayed
- [ ] **Click "Submit Questionnaire"**
  - [ ] Loading modal appears: "I'm building your sales machine!"
  - [ ] Text: "This may take up to 5 minutes"
  - [ ] Text: "Don't close this window."
  - [ ] Text: "(It will update automatically once I'm done)"

### Phase 2: Strategy Generation

**Monitor Vercel logs for:**
- [ ] ✅ Phase 1 (Workspace) completes
- [ ] ✅ Phase 2 (Content) starts
- [ ] ✅ Cold Emails (all 5 variants)
- [ ] ✅ LinkedIn Posts (3 variants)
- [ ] ✅ LinkedIn DMs (3 variants) **INCLUDING Ask A Question**
- [ ] ✅ Newsletters (2 variants)
- [ ] ✅ YouTube Scripts **INCLUDING Long-Form**
- [ ] ✅ Call Prep

**Look for these specific logs:**
```
⚠️ Using hardcoded LinkedIn DM: Ask A Question agent (ca_mKHrB6A2yNiBN5yRPPsOm)
⚠️ Using hardcoded YouTube: Long-Form Script agent (ca_oR6ro10L1z7N8HouxVgNc)
💬 Generating LinkedIn DM: Ask A Question...
✅ LinkedIn DM: Ask A Question completed successfully
🎬 Generating YouTube Scripts...
🔄 Running YouTube Script: Long-Form agent...
✅ YouTube Script: Long-Form completed successfully
```

### Phase 3: Results Page

- [ ] **Redirects to `/results` automatically**
- [ ] **Header displays:**
  - [ ] Claire's avatar
  - [ ] "{COMPANY_NAME}'s Sales Plan"
  - [ ] "Actionable systems. Fast results. No drama." (FO Dark Grey)
  - [ ] **"Share Strategy" button** (top right)
- [ ] **Navigation sidebar works** (scrolls to sections, highlights active)
- [ ] **All sections render:**
  - [ ] Campaign Ideas
  - [ ] Prospect List
  - [ ] Cold Email Sequences (5 tabs, Gmail + Outlook logos)
  - [ ] LinkedIn Posts (3 tabs)
  - [ ] LinkedIn DMs (3 tabs) **INCLUDING "Ask A Question" tab**
  - [ ] Newsletter Content (2 tabs, HubSpot + Salesforce + Kit logos)
  - [ ] **YouTube Video Scripts** (with YouTube logo)
  - [ ] Call Prep (questions styled with orange border)
- [ ] **Text is uncopyable** (select-none class applied)
- [ ] **Videos align to top** of divs (not centered)
- [ ] **Markdown line breaks** render correctly (especially Call Prep)

### Phase 4: Shareable Link Feature

- [ ] **Click "Share Strategy" button**
  - [ ] Toast notification: "Share link created and copied to clipboard!"
  - [ ] Button is **replaced** with countdown timer
- [ ] **Timer displays correctly:**
  - [ ] Shows "14 days left" (or current remaining time)
  - [ ] Black background with green diamond (14-11 days)
  - [ ] Text: "Upgrade now and add to your CRM"
  - [ ] CTA links to HubSpot meeting
- [ ] **Open shareable link in incognito window**
  - [ ] URL format: `/share-claire-strategy/[shareId]`
  - [ ] Loads **without requiring login**
  - [ ] Content identical to `/results` page
  - [ ] Timer displays at top
  - [ ] All sections visible
- [ ] **Timer color changes** (test by manually adjusting `expires_at` in DB):
  - [ ] 14-11 days: Black bg (`bg-gray-900`), green diamond
  - [ ] 10-6 days: Orange bg (`bg-orange-500`), orange diamond
  - [ ] 5-0 days: Red bg (`bg-red-600`), red diamond
  - [ ] 0 days: "Strategy Expired" message
- [ ] **Click "Share Strategy" again**
  - [ ] Returns **existing** link (no duplicate)
  - [ ] Toast: "Share link copied to clipboard!"

### Phase 5: Data Integrity

- [ ] **Check Supabase `octave_outputs` table:**
  - [ ] `linkedin_dms` has `askQuestion` field populated
  - [ ] `youtube_scripts` has `longForm` field populated
  - [ ] All other fields populated correctly
- [ ] **Check Supabase `shared_strategies` table:**
  - [ ] One row per user (UNIQUE constraint works)
  - [ ] `expires_at` is 14 days from `created_at`
  - [ ] `is_active` = true
  - [ ] `share_id` is unique

---

## 🚨 Known Issues to Watch For

1. **"Ask A Question" DM not showing?**
   - Check logs for: `✅ LinkedIn DM: Ask A Question completed successfully`
   - If missing, agent ID might be incorrect

2. **YouTube Scripts not showing?**
   - Check logs for: `✅ YouTube Script: Long-Form completed successfully`
   - If missing, agent ID might be incorrect

3. **Share button not working?**
   - Run SQL migration: `supabase-shared-strategies.sql`
   - Check browser console for errors

4. **Timer not appearing after sharing?**
   - Check `shared_strategies` table has a row for the user
   - Verify `expires_at` is in the future

5. **Shareable link shows "Strategy Expired" immediately?**
   - Check RLS policies on `shared_strategies` table
   - Verify `is_active` = true and `expires_at` > NOW()

---

## 🎯 Success Criteria

**All of the following must be true:**

✅ Questionnaire saves correctly (including Q19-21)  
✅ Strategy generates with ALL outputs (including Ask A Question DM + YouTube)  
✅ Results page displays all sections properly  
✅ Share Strategy creates unique link  
✅ Countdown timer displays and counts down  
✅ Shareable link is publicly accessible (no login)  
✅ Markdown renders with proper line breaks  
✅ Call Prep questions are styled (orange border)  
✅ All logos display correctly (Gmail, Outlook, HubSpot, Salesforce, Kit, YouTube)

---

## 📞 If Issues Arise

1. **Check Vercel deployment logs** (real-time)
2. **Check browser console** (F12 → Console tab)
3. **Check Supabase logs** (Dashboard → Logs)
4. **Verify SQL migration ran** (check if `shared_strategies` table exists)

---

## 🚀 Ready to Test!

Start from a **fresh incognito window** to simulate a brand new client experience.

Good luck! 💎

