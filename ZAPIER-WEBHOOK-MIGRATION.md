# 🔄 Zapier Webhook Variable Migration Guide

## Overview

We've updated the Zapier webhook environment variable naming convention to be more descriptive and scalable for multiple webhooks in the app.

## 📋 What Changed

### Old Variable Names → New Variable Names

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `ZAPIER_WEBHOOK_URL` | `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` | Triggered when user submits questionnaire on review page |
| `ZAPIER_SIGNUP_WEBHOOK_URL` | `ZAPIER_WEBHOOK_USER_SIGNUP` | Triggered when verified user signs in for first time |

### Why This Change?

✅ **Clear trigger location**: Variable names now indicate WHERE the webhook is triggered  
✅ **Scalable naming**: Easy to add more webhooks without confusion  
✅ **Better organization**: Consistent naming convention across all webhooks  
✅ **Self-documenting**: Variable names explain their purpose  

---

## 🚀 Migration Steps

### Step 1: Update Local Environment (`.env.local`)

**Old configuration:**
```env
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/12345/abcde/
ZAPIER_SIGNUP_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/12345/fghij/
```

**New configuration:**
```env
ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT=https://hooks.zapier.com/hooks/catch/12345/abcde/
ZAPIER_WEBHOOK_USER_SIGNUP=https://hooks.zapier.com/hooks/catch/12345/fghij/
```

**Actions:**
1. Open your `.env.local` file
2. Copy the webhook URLs from the old variables
3. Delete the old variables
4. Add the new variables with the same URLs
5. Save the file
6. Restart your dev server: `npm run dev`

---

### Step 2: Update Vercel Environment Variables

#### Option A: Update via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your team workspace
3. Go to your project: `fractional-ops-onboarding`
4. Click **Settings** → **Environment Variables**
5. **Delete old variables:**
   - Delete `ZAPIER_WEBHOOK_URL`
   - Delete `ZAPIER_SIGNUP_WEBHOOK_URL` (if it exists)
6. **Add new variables:**
   
   **Variable 1:**
   - Name: `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT`
   - Value: [Your questionnaire webhook URL]
   - Environment: Production (and Preview if needed)
   - Click "Save"
   
   **Variable 2:**
   - Name: `ZAPIER_WEBHOOK_USER_SIGNUP`
   - Value: [Your signup webhook URL]
   - Environment: Production (and Preview if needed)
   - Click "Save"

7. **Redeploy:**
   - Go to **Deployments** tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

#### Option B: Update via Vercel CLI

```bash
# Remove old variables
vercel env rm ZAPIER_WEBHOOK_URL production
vercel env rm ZAPIER_SIGNUP_WEBHOOK_URL production

# Add new variables
vercel env add ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT production
# Paste your URL when prompted

vercel env add ZAPIER_WEBHOOK_USER_SIGNUP production
# Paste your URL when prompted

# Trigger redeploy
vercel --prod
```

---

## ✅ Verification Checklist

### Local Development:
- [ ] Updated `.env.local` with new variable names
- [ ] Restarted dev server
- [ ] Test questionnaire submission → Check logs for webhook success
- [ ] Test new user signup → Check logs for webhook success

### Production:
- [ ] Updated Vercel environment variables
- [ ] Redeployed application
- [ ] Test questionnaire submission in production
- [ ] Check Vercel logs for webhook success
- [ ] Check Zapier Zap History for triggers

---

## 📊 Expected Log Messages

### Questionnaire Submit Webhook:
```
📄 Generating PDF for: user@example.com
📤 Sending to Zapier webhook: https://hooks.zapier.com/...
✅ Successfully sent to Zapier
```

### User Signup Webhook:
```
🎉 First login detected for verified user: user@example.com
📤 Sending signup event to Zapier webhook
✅ Successfully sent signup to Zapier
```

---

## 🛠️ Troubleshooting

### Issue: "Zapier questionnaire submit webhook URL not configured"
**Solution:**
- Verify you added `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` (not the old name)
- Check for typos in variable name
- Restart dev server or redeploy to Vercel

### Issue: "Zapier user signup webhook URL not configured"
**Solution:**
- Verify you added `ZAPIER_WEBHOOK_USER_SIGNUP` (not the old name)
- Check for typos in variable name
- Restart dev server or redeploy to Vercel

### Issue: Webhooks not triggering in production
**Solution:**
- Verify new variable names are in Vercel (not old names)
- Check Vercel deployment logs for any errors
- Ensure variables are set for "Production" environment
- Redeploy after adding variables

---

## 🎯 Future Webhook Naming Convention

When adding new webhooks in the future, follow this pattern:

```
ZAPIER_WEBHOOK_[TRIGGER_LOCATION]_[ACTION]
```

**Examples:**
```env
ZAPIER_WEBHOOK_FILE_UPLOAD          # When file is uploaded
ZAPIER_WEBHOOK_OCTAVE_WORKSPACE     # When Octave workspace created
ZAPIER_WEBHOOK_PDF_GENERATED        # When PDF is generated
ZAPIER_WEBHOOK_USER_LOGOUT          # When user logs out
```

---

## 📞 Need Help?

- Check server logs (local console or Vercel logs)
- Verify Zapier Zap History for webhook triggers
- Ensure webhook URLs haven't changed
- Test webhooks with curl to verify they're working

---

## ✅ Migration Complete!

Once you've completed both steps and verified the webhooks are working, you're all set! 🎉

The old variable names are no longer used in the codebase, so you can safely delete them from your environment.

**Happy automating!** 🚀

