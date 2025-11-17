# 🎉 Signup Tracking Setup Guide

## Overview

This app now tracks verified user signups and sends them to Zapier for HubSpot integration and email notifications.

## How It Works

1. **User Signs Up** → Creates account with email/password
2. **User Verifies Email** → Clicks confirmation link from Supabase
3. **User Signs In (First Time)** → System detects it's their first login
4. **Webhook Triggered** → Sends signup data to Zapier
5. **Zapier Actions** → Adds to HubSpot + sends email notification

## Setup Instructions

### Step 1: Create Zapier Webhook

1. Go to [Zapier](https://zapier.com) and create a new Zap
2. **Trigger**: Webhooks by Zapier → Catch Hook
3. Copy the webhook URL (looks like: `https://hooks.zapier.com/hooks/catch/12345/abcdef/`)

### Step 2: Configure Zapier Actions

#### Action 1: Add to HubSpot
- **App**: HubSpot
- **Action**: Create or Update Contact
- **Email**: `{{email}}` from webhook
- **Properties**:
  - Signup Date: `{{signupTimestamp}}`
  - Source: `{{source}}`
  - Status: `{{status}}`
  - User ID: `{{userId}}`

#### Action 2: Send Email Notification
- **App**: Email by Zapier (or Gmail)
- **To**: your-email@fractionalops.com
- **Subject**: `🎉 New User Signup: {{email}}`
- **Body**:
  ```
  New verified user signed up!
  
  Email: {{email}}
  User ID: {{userId}}
  Signup Time: {{signupTimestamp}}
  Source: {{source}}
  
  This user has verified their email and completed first login.
  ```

### Step 3: Add Environment Variable

#### Local Development
Add to `.env.local`:
```env
ZAPIER_WEBHOOK_USER_SIGNUP=https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/
```

Then restart your dev server:
```bash
npm run dev
```

#### Production (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name**: `ZAPIER_WEBHOOK_USER_SIGNUP`
   - **Value**: Your Zapier webhook URL
   - **Environment**: Production (and Preview if needed)
5. Redeploy the app

## What Gets Sent to Zapier

```json
{
  "email": "user@example.com",
  "userId": "uuid-12345-67890",
  "signupTimestamp": "2025-01-15T10:30:00.000Z",
  "source": "Fractional Ops Onboarding App",
  "status": "verified",
  "appVersion": "1.0",
  "signupMethod": "email_password"
}
```

## Testing

### Test Flow:
1. **Create a test user** (use a real email you can access)
2. **Check your email** for Supabase verification link
3. **Click the verification link**
4. **Sign in for the first time**
5. **Check console logs** for:
   ```
   🎉 First login detected for verified user: test@example.com
   📤 Sending signup event to Zapier webhook
   ✅ Successfully sent signup to Zapier
   ```
6. **Check Zapier** → Zap History for the trigger
7. **Check HubSpot** for the new contact
8. **Check your email** for the notification

### Test Multiple Times:
- ✅ **First login**: Webhook triggers
- ✅ **Second login**: No webhook (already tracked)
- ✅ **Third login**: No webhook (already tracked)

This ensures users are only tracked once!

## Important Notes

### ✅ Tracking Logic:
- **Only verified users** are tracked (after email confirmation)
- **Only first login** triggers the webhook
- **Non-blocking**: Won't slow down login if Zapier is slow
- **Error tolerant**: Login succeeds even if tracking fails

### 🔍 Monitoring:
Check server logs (Vercel or local) for:
- `🎉 First login detected` = User is being tracked
- `📤 Sending signup event` = Webhook being sent
- `✅ Successfully sent to Zapier` = Success!
- `⚠️ Signup tracking failed` = Non-critical error (login still works)

### 🛠️ Troubleshooting:

**Webhook not triggering?**
- ✅ Check `ZAPIER_WEBHOOK_USER_SIGNUP` is set correctly
- ✅ Verify Zap is turned ON in Zapier
- ✅ Look at server logs for errors
- ✅ Test webhook URL manually with curl

**Getting "URL not configured" error?**
- ✅ Add `ZAPIER_WEBHOOK_USER_SIGNUP` to environment variables
- ✅ Restart dev server (local) or redeploy (Vercel)
- ✅ Check for typos in variable name

**User tracked multiple times?**
- ✅ This shouldn't happen - check `questionnaire_responses` table
- ✅ Verify user has data in the database

## Files Modified

- ✅ `app/api/webhooks/signup-tracking/route.ts` (NEW)
- ✅ `lib/supabase.ts` (updated `signInWithEmail` function)

## Next Steps

1. ✅ Get your Zapier webhook URL
2. ✅ Configure Zapier actions (HubSpot + Email)
3. ✅ Add `ZAPIER_WEBHOOK_USER_SIGNUP` to environment
4. ✅ Test with a real signup
5. ✅ Monitor first few signups to ensure it works

Happy tracking! 🚀

