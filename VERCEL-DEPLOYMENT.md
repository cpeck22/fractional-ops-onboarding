# Vercel Deployment Guide

## 🚀 Deploy to Production

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `cpeck22/fractional-ops-onboarding`
4. Select the repository and click **"Import"**

### Step 2: Configure Environment Variables
⚠️ **CRITICAL**: Add these environment variables in Vercel:

1. Click **"Environment Variables"** during setup
2. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://wmvccwxvtwhtlrltbnej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdmNjd3h2dHdodGxybHRibmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzA3MTEsImV4cCI6MjA3NjU0NjcxMX0.O1nhd_nJJWCPjhr_iDehT5tXAIanAHsk1FjPfav9j0g
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdmNjd3h2dHdodGxybHRibmVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk3MDcxMSwiZXhwIjoyMDc2NTQ2NzExfQ.gDDsCzw8ewkT_Bzl4Z3RMS5l7jAddPnlApASIGsVnKQ
```

⚠️ Make sure to apply these to **ALL ENVIRONMENTS** (Production, Preview, Development)

### Step 3: Update Supabase Email Redirect URLs
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej
2. Go to **Authentication** → **URL Configuration**
3. Add your Vercel production URL to **Redirect URLs**:
   - `https://your-app-name.vercel.app/signin`
   - `https://your-app-name.vercel.app/questionnaire`

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for the build to complete (~2-3 minutes)
3. Once deployed, you'll get a production URL like: `https://fractional-ops-onboarding.vercel.app`

### Step 5: Test Production
1. Visit your production URL
2. Test the following flow:
   - ✅ Sign up with a new email
   - ✅ Verify email (check spam folder)
   - ✅ Sign in
   - ✅ Fill out questionnaire
   - ✅ Click "Save Progress"
   - ✅ Log out
   - ✅ Sign in again (data should persist)

## 🔧 Troubleshooting

### If signup email doesn't arrive:
- Check spam folder (emails come from "Supabase")
- Verify Supabase email settings are enabled
- Check Supabase logs in dashboard

### If save doesn't work:
- Check Vercel logs for API route errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check Network tab for failed API calls

### If authentication fails:
- Verify all 3 environment variables are set in Vercel
- Make sure redirect URLs are configured in Supabase
- Check browser console for errors

## 📊 Monitoring

- **Vercel Dashboard**: Monitor deployments, logs, and analytics
- **Supabase Dashboard**: Monitor database, auth users, and API usage

## 🎉 Success Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and connected
- [ ] Environment variables added to Vercel
- [ ] Supabase redirect URLs updated
- [ ] Production deployment successful
- [ ] Signup flow tested
- [ ] Save functionality tested
- [ ] Data persistence verified
- [ ] Logout tested

---

**Your production app will be live at**: https://fractional-ops-onboarding.vercel.app (or similar)

🚀 **READY TO LAUNCH!**

