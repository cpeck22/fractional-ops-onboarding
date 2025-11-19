# 🚀 Quick Setup Guide: Claire's Free Strategy Feature

## ⚡ 5-Minute Setup

### **Step 1: Database Setup (2 minutes)**

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the file: `supabase-octave-outputs.sql`
4. Verify table created: `octave_outputs`

**Quick SQL:**
```sql
-- Copy and run from supabase-octave-outputs.sql
CREATE TABLE octave_outputs (...);
ALTER TABLE octave_outputs ENABLE ROW LEVEL SECURITY;
-- See file for complete SQL
```

---

### **Step 2: Verify Environment Variables (1 minute)**

Check your Vercel dashboard has these set:

✅ `NEXT_PUBLIC_SUPABASE_URL`  
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
✅ `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRITICAL**  
✅ `OCTAVE_API_KEY`  
✅ `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT`  
✅ `ZAPIER_WEBHOOK_USER_SIGNUP`

---

### **Step 3: Deploy to Vercel (2 minutes)**

```bash
# Add all changes
git add .

# Commit
git commit -m "feat: Add Claire's Free Strategy with 6 AI agents"

# Push to trigger deployment
git push origin main
```

**Vercel will automatically deploy!**

---

## 🧪 Test It!

### **Quick Test:**

1. Go to your deployed app
2. Sign up with test email
3. Complete questionnaire (use real company domain for best results)
4. Wait for processing modal (~2-5 minutes)
5. Click "🎯 CRO Strategy Built By Claire" button
6. Verify all sections load

### **Expected Results:**

✅ Campaign Ideas (if you added client references)  
✅ Prospect List (25 people)  
✅ Email Sequences (3 emails)  
✅ LinkedIn Post  
✅ Newsletter  
✅ LinkedIn DM  
✅ Call Prep Example

---

## 🔍 Debugging

### **If Something Doesn't Work:**

1. **Check Vercel Logs:**
   - Look for "🎯 STARTING AGENT EXECUTION"
   - Look for "✅ Generated" or "⚠️ Failed" messages

2. **Check Supabase:**
   - SQL Editor → `SELECT * FROM octave_outputs;`
   - Should see one row per user

3. **Check Agent IDs:**
   - File: `/app/api/octave/agents/route.ts`
   - Verify agent IDs match your Octave workspace

---

## 🎯 Agent IDs Reference

Current agent IDs (update in `/app/api/octave/agents/route.ts`):

```typescript
prospector: 'ca_lSWcHq7U7KboGGaaESrQX'
sequence: 'ca_dobh4WdpkbFWQT8pJqJJg'
callPrep: 'ca_1ikwfmH5JBxJbygNGlgoc'
linkedinPost: 'ca_LpMPulsXSRPkhO9T2fJo8'
newsletter: 'ca_oztYMqaYywqjiCZLjKWTs'
linkedinDM: 'ca_R9tuDLXcizpmvV1ICjsyu'
```

---

## 📞 Need Help?

1. Check full documentation: `CLAIRE-STRATEGY-FEATURE.md`
2. Check Vercel deployment logs
3. Check Supabase logs
4. Contact Nalin for Octave agent issues

---

## ✅ Deployment Checklist

- [ ] SQL file run in Supabase
- [ ] Table `octave_outputs` exists
- [ ] Environment variables set in Vercel
- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Test submission completed
- [ ] All 7 sections display data
- [ ] Error placeholders work correctly
- [ ] New tab opens correctly

---

**Ready to launch! 🚀**


