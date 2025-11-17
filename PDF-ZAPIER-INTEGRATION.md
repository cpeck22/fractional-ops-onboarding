# 📄 PDF Generation & Zapier Integration

## Overview

When a client submits their questionnaire, the app now:

1. ✅ Sends data to Octave (existing functionality)
2. ✅ **Generates a PDF** with all questions and answers
3. ✅ **Sends the PDF to Zapier** webhook for delivery to Monday.com

---

## 🎯 Features

### PDF Generation
- **Automatic**: PDF is generated on questionnaire submission
- **Formatted**: Clean, structured format with all 25 questions
- **Includes Metadata**: Client's email and company name at the top
- **Proper Filename**: `RevOps_Onboarding_<CompanyName>_<ClientEmail>.pdf`

### Zapier Integration
- **Webhook Delivery**: PDF is sent via HTTP POST to your Zapier webhook
- **Non-Blocking**: If Zapier fails, Octave integration still succeeds
- **Metadata Included**: Email, company name, and filename sent alongside PDF

---

## 📋 PDF Document Format

The generated PDF includes:

```
<Client's Email Address>
<Company Name>

Question 1: Company Name*
<Answer>

Question 2: Company Domain
<Answer>

... (all 25 questions with answers)
```

All questions from the questionnaire are included in order:
- **Company Information** (Questions 1-2)
- **Basic Information** (Questions 3-11)
- **ICP - Ideal Customer Profile** (Questions 12-18)
- **Social Proof** (Questions 19-21)
- **Call to Action** (Questions 22-25)

---

## 🔧 Setup Instructions

### 1. Install Dependencies

Already installed:
```bash
npm install jspdf form-data
```

### 2. Set Up Zapier Webhook

1. Go to [Zapier](https://zapier.com) and create a new Zap
2. Choose **Webhooks by Zapier** as the trigger
3. Select **Catch Hook** (or **Catch Raw Hook** for file uploads)
4. Copy the webhook URL provided by Zapier
5. Add it to your `.env.local` file:

```env
ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT=https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/
```

### 3. Configure Zapier to Monday.com

In your Zapier workflow:

**Step 1: Trigger**
- App: Webhooks by Zapier
- Event: Catch Hook
- Receives: `file`, `email`, `companyName`, `fileName`

**Step 2: Action**
- App: Monday.com
- Action: Upload File to Column
- Board: Select your RevOps Onboarding board
- Item: Map by company name or email
- File Column: Select your file column
- File: Map from webhook `file` field

**Step 3: Test & Publish**
- Test the Zap with sample data
- Turn on the Zap

---

## 🧩 Technical Architecture

### File Structure
```
/lib/pdfGenerator.ts               # PDF generation utility
/app/api/send-to-zapier/route.ts  # Zapier webhook endpoint
/app/api/octave/workspace/route.ts # Main submission (calls both Octave & Zapier)
/app/review/page.tsx               # Review page (sends email with data)
```

### Flow Diagram
```
Client Submits
    ↓
Review Page (collects email + data)
    ↓
POST /api/octave/workspace
    ↓
    ├── Send to Octave API ✅
    │   └── Create workspace
    │
    └── POST /api/send-to-zapier
        ├── Generate PDF (jsPDF)
        ├── Create FormData with PDF
        └── POST to Zapier Webhook
            └── Zapier → Monday.com
```

---

## 📤 API Endpoints

### POST `/api/octave/workspace`
**Purpose**: Main submission endpoint

**Request Body**:
```json
{
  "email": "client@example.com",
  "questionnaireData": {
    "companyInfo": { ... },
    "basicInfo": { ... },
    "icp": { ... },
    "socialProof": { ... },
    "callToAction": { ... },
    "brand": { ... }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* Octave response */ }
}
```

### POST `/api/send-to-zapier`
**Purpose**: Generate PDF and send to Zapier

**Request Body**:
```json
{
  "email": "client@example.com",
  "questionnaireData": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "message": "PDF generated and sent to Zapier successfully",
  "fileName": "RevOps_Onboarding_CompanyName_client_example_com.pdf",
  "zapierResponse": { /* Zapier response */ }
}
```

---

## 🧪 Testing

### Test Locally

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Fill out questionnaire**: 
   - Sign up/login at `http://localhost:3000`
   - Complete all questionnaire sections
   - Go to review page

3. **Submit**: 
   - Click "Submit & Create Workspace"
   - Check console logs for:
     - ✅ PDF generation logs
     - ✅ Zapier webhook call
     - ✅ Octave API call

4. **Verify in Zapier**:
   - Go to your Zap history
   - Check for the webhook trigger
   - Verify file was received

### Console Logs to Look For

```
📥 Received submission from: client@example.com
📄 Generating PDF for: client@example.com
📄 PDF generated: RevOps_Onboarding_CompanyName_client_example_com.pdf Size: 45678 bytes
📤 Sending to Zapier webhook: https://hooks.zapier.com/...
✅ Successfully sent to Zapier: { ... }
```

---

## 🐛 Troubleshooting

### PDF Not Generating

**Issue**: PDF generation fails
**Solution**: 
- Check that jsPDF is installed: `npm list jspdf`
- Verify questionnaire data is complete
- Check console for error messages

### Zapier Webhook Failing

**Issue**: Zapier returns 404 or error
**Solution**:
- Verify `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` is correct in `.env.local`
- Test the webhook URL directly with curl:
  ```bash
  curl -X POST https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/ \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```
- Check Zapier dashboard for webhook status

### File Not Appearing in Monday.com

**Issue**: Webhook works but file doesn't upload
**Solution**:
- Check Zapier action configuration
- Verify Monday.com permissions
- Test with smaller PDF file
- Check Monday.com board has file column

### Environment Variable Not Found

**Issue**: `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT` not configured error
**Solution**:
- Create `.env.local` file in project root
- Add: `ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT=your-webhook-url`
- Restart dev server: `npm run dev`
- For production: Add to Vercel environment variables

---

## 🚀 Deployment (Vercel)

### Add Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   ZAPIER_WEBHOOK_QUESTIONNAIRE_SUBMIT = https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/
   ```
3. Redeploy the application

### Verify Production

1. Submit a test questionnaire in production
2. Check Vercel logs for PDF generation
3. Verify in Zapier webhook history
4. Check Monday.com for uploaded file

---

## 📊 Data Flow

### Questionnaire Data → PDF Mapping

| Section | Questions | PDF Output |
|---------|-----------|------------|
| Company Info | 1-2 | Company Name, Domain |
| Basic Info | 3-11 | Industry, What/How, Value, Service, etc. |
| ICP | 12-18 | Seniority, Titles, Size, Markets, etc. |
| Social Proof | 19-21 | Proof Points, References, Competitors |
| Call to Action | 22-25 | Lead Magnet, Email Examples |

### File Metadata Sent to Zapier

```javascript
{
  file: <PDF Buffer>,
  email: "client@example.com",
  companyName: "Acme Corp",
  fileName: "RevOps_Onboarding_Acme_Corp_client_example_com.pdf"
}
```

---

## ✅ Success Criteria

When working correctly, you should see:

1. ✅ Client submits questionnaire
2. ✅ PDF is generated with all Q&A
3. ✅ PDF is sent to Zapier webhook
4. ✅ Zapier receives the file
5. ✅ Monday.com board gets the file in the file column
6. ✅ Client sees success message
7. ✅ Octave workspace is created

---

## 🎉 What's Next?

Your Zapier webhook can now:
- Parse the PDF metadata
- Create or update Monday.com items
- Upload file to the file column
- Trigger additional workflows
- Send notifications

The PDF will have all 25 questions formatted and ready for your team to review! 🚀

