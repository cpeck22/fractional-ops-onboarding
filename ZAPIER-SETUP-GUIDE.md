# 🚀 Zapier Setup Guide for PDF to Monday.com Integration

## Quick Start Checklist

- [ ] Create Zapier Webhook
- [ ] Configure Monday.com Action
- [ ] Add `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` to environment variables
- [ ] Test the integration
- [ ] Deploy to production

---

## 📋 Step-by-Step Setup

### Step 1: Create Zapier Webhook

1. **Log in to Zapier**: Go to [zapier.com](https://zapier.com)

2. **Create New Zap**: Click "Create Zap" button

3. **Set Up Trigger**:
   - Search for "Webhooks by Zapier"
   - Choose event: **"Catch Hook"**
   - Click Continue
   - **Copy the webhook URL** (you'll need this!)
   - Example: `https://hooks.zapier.com/hooks/catch/12345678/abcdefg/`

4. **Test the Trigger** (optional for now):
   - You can test after we add the URL to the app

---

### Step 2: Configure Monday.com Action

1. **Add Action Step**:
   - Click the "+" button
   - Search for "Monday.com"
   - Choose Monday.com

2. **Choose Action Event**:
   - Select: **"Upload File to Column"**
   - Click Continue

3. **Connect Monday.com Account**:
   - Click "Sign in to Monday.com"
   - Authorize Zapier to access your Monday.com account

4. **Set Up Action**:
   - **Board**: Select your "RevOps Onboarding" board
   - **Item**: Choose how to identify items:
     - Option A: Create new item with company name
     - Option B: Find existing item by name/email
   - **File Column**: Select the file column where PDF should go
   - **File**: Select the `file` field from the webhook data
   - **File Name**: Select the `fileName` field from webhook

5. **Test the Action**: 
   - Skip for now, we'll test end-to-end later

6. **Turn On Zap**:
   - Give it a name: "RevOps PDF to Monday.com"
   - Click "Publish"

---

### Step 3: Add Environment Variable

#### For Local Development

1. **Create/Edit `.env.local`** file in your project root:
   ```env
   ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT=https://hooks.zapier.com/hooks/catch/12345678/abcdefg/
   ```
   (Replace with your actual webhook URL from Step 1)

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

#### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT`
   - **Value**: `https://hooks.zapier.com/hooks/catch/12345678/abcdefg/`
   - **Environment**: Production (and Preview if needed)
5. Click "Save"
6. **Redeploy** your application

---

### Step 4: Test the Integration

#### Local Testing

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Fill out questionnaire**:
   - Go to `http://localhost:3000`
   - Sign up or log in
   - Complete all questionnaire sections
   - Go to review page

3. **Submit**:
   - Click "Submit & Create Workspace"
   - Watch the console logs

4. **Verify**:
   - ✅ Console shows: "📄 PDF generated"
   - ✅ Console shows: "📤 Sending to Zapier webhook"
   - ✅ Console shows: "✅ Successfully sent to Zapier"
   - ✅ Check Zapier dashboard → Zap History
   - ✅ Check Monday.com for the uploaded file

#### Production Testing

1. Go to your production URL
2. Submit a real questionnaire
3. Verify in Zapier History
4. Check Monday.com board

---

## 🎯 Expected Data Flow

### 1. Questionnaire Submission
```
Client fills out all 25 questions
  ↓
Clicks "Submit & Create Workspace"
  ↓
Data sent to /api/octave/workspace with email
```

### 2. Server Processing
```
Server receives submission
  ↓
├─ Send to Octave API (create workspace) ✅
  ↓
└─ Call /api/send-to-zapier
   ├─ Generate PDF with jsPDF
   ├─ Format: RevOps_Onboarding_<Company>_<Email>.pdf
   └─ Send to Zapier webhook
```

### 3. Zapier Processing
```
Zapier receives webhook
  ↓
Parses payload:
  - file: PDF buffer
  - email: client@example.com
  - companyName: "Acme Corp"
  - fileName: "RevOps_Onboarding_Acme_Corp_client_example_com.pdf"
  ↓
Monday.com Action:
  - Find/Create item
  - Upload file to file column
```

---

## 🔍 Zapier Webhook Payload

Your Zapier webhook will receive:

```json
{
  "file": "<PDF binary data>",
  "email": "client@example.com",
  "companyName": "Acme Corp",
  "fileName": "RevOps_Onboarding_Acme_Corp_client_example_com.pdf"
}
```

---

## 🎨 Monday.com Board Setup

### Required Columns

Your Monday.com board should have:

1. **Name/Text Column**: For company name or identifier
2. **Email Column**: For client email (optional)
3. **File Column**: For the PDF upload ⭐
4. **Status Column**: For tracking submission status (optional)

### Recommended Board Structure

| Company Name | Client Email | Submission Date | PDF File | Status |
|--------------|--------------|-----------------|----------|--------|
| Acme Corp | client@acme.com | Jan 15, 2024 | [PDF Icon] | Received |

---

## 🧪 Testing Your Zap

### Test with Curl (Optional)

You can test your Zapier webhook directly:

```bash
curl -X POST "https://hooks.zapier.com/hooks/catch/12345678/abcdefg/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "companyName": "Test Company",
    "fileName": "test.pdf"
  }'
```

Check Zapier dashboard for the trigger.

---

## ⚠️ Troubleshooting

### Webhook Not Triggering

**Problem**: Zapier doesn't receive webhook

**Solutions**:
- ✅ Verify `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` is correct in `.env.local`
- ✅ Check Zapier Zap is turned ON
- ✅ Look at server console logs for Zapier call
- ✅ Test webhook URL with curl

### PDF Not Uploading to Monday.com

**Problem**: Webhook works but file doesn't appear

**Solutions**:
- ✅ Verify Monday.com connection in Zapier
- ✅ Check board permissions
- ✅ Ensure file column exists
- ✅ Look at Zapier error logs

### Environment Variable Not Working

**Problem**: "ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT not configured" error

**Solutions**:
- ✅ Create `.env.local` file
- ✅ Restart dev server after adding variable
- ✅ For production: Add to Vercel and redeploy
- ✅ Verify no typos in variable name

---

## 📊 Monitoring

### Check These Logs

1. **Local/Vercel Console Logs**:
   ```
   📥 Received submission from: client@example.com
   📄 Generating PDF for: client@example.com
   📄 PDF generated: RevOps_Onboarding_Company_email.pdf Size: 45678 bytes
   📤 Sending to Zapier webhook: https://hooks.zapier.com/...
   ✅ Successfully sent to Zapier
   ```

2. **Zapier Zap History**:
   - Go to your Zap
   - Click "Zap History" tab
   - See all webhook triggers and results

3. **Monday.com Board**:
   - Check for new items or updated items
   - Verify file is attached

---

## 🎉 Success Indicators

When everything works:

1. ✅ Client submits questionnaire
2. ✅ Console logs show PDF generation
3. ✅ Console logs show Zapier webhook success
4. ✅ Zapier History shows successful trigger
5. ✅ Monday.com board has new file in file column
6. ✅ Client sees "Onboarding completed successfully!" message

---

## 🔄 Advanced Zapier Configuration (Optional)

### Add More Actions

After the Monday.com upload, you can add additional actions:

1. **Send Email Notification**:
   - Notify your team of new submission
   - Include PDF link

2. **Slack Notification**:
   - Post to channel when new PDF arrives
   - Include company name and link

3. **Google Drive Backup**:
   - Also save PDF to Google Drive
   - Organize by company name

4. **Create Calendar Event**:
   - Schedule follow-up call
   - Add to team calendar

### Filter & Conditional Logic

Add filters to:
- Only process certain companies
- Skip if already exists
- Route to different boards based on criteria

---

## 📞 Need Help?

If you encounter issues:

1. **Check Documentation**: See `PDF-ZAPIER-INTEGRATION.md`
2. **Console Logs**: Look for error messages
3. **Zapier History**: Check for failed triggers
4. **Test Endpoints**: Use curl to test each step

---

## 🚀 Ready to Go!

Your PDF automation is now set up! Every questionnaire submission will:

1. Generate a professional PDF
2. Send to Zapier
3. Upload to Monday.com
4. Be ready for your team to review

**Next Steps**:
1. Test with a real submission
2. Monitor first few submissions
3. Adjust Monday.com board as needed
4. Add additional Zapier actions if desired

Happy automating! 🎊

