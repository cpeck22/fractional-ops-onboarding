# 🚀 PDF to Monday.com - Quick Start

## ⚡ 3-Minute Setup

### Step 1: Create Zapier Webhook (2 min)
1. Go to [zapier.com](https://zapier.com) → Create Zap
2. Trigger: **Webhooks by Zapier** → **Catch Hook**
3. Copy the webhook URL
4. Action: **Monday.com** → **Upload File to Column**
5. Connect Monday.com, select board and file column
6. Publish the Zap

### Step 2: Add Environment Variable (1 min)
```bash
# Add to .env.local
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/

# Restart server
npm run dev
```

### Step 3: Test (2 min)
1. Go to `http://localhost:3000`
2. Complete questionnaire
3. Submit
4. Check Zapier history
5. Verify file in Monday.com ✅

---

## 📋 What Happens Now

```
Client Submits Questionnaire
          ↓
    Generate PDF with all Q&A
          ↓
    Send to Zapier Webhook
          ↓
  Upload to Monday.com File Column ✅
```

---

## 🔍 Verify It Works

### Console Logs
```
✅ 📄 PDF generated: RevOps_Onboarding_Company_email.pdf
✅ 📤 Sending to Zapier webhook
✅ Successfully sent to Zapier
```

### Zapier Dashboard
- Check "Zap History" tab
- See webhook trigger with file

### Monday.com Board
- New file in file column
- Named: `RevOps_Onboarding_<Company>_<Email>.pdf`

---

## 📄 PDF Contains

All 25 questions and answers:
- Company Information (Q1-2)
- Basic Information (Q3-11)
- ICP Profile (Q12-18)
- Social Proof (Q19-21)
- Call to Action (Q22-25)

---

## 🐛 Quick Fixes

| Problem | Fix |
|---------|-----|
| "Webhook URL not configured" | Add to `.env.local`, restart |
| Zapier not triggering | Check URL, verify Zap is ON |
| File not in Monday.com | Check board permissions |

---

## 📚 Full Documentation

- **Setup**: `ZAPIER-SETUP-GUIDE.md`
- **Technical**: `PDF-ZAPIER-INTEGRATION.md`
- **Overview**: `IMPLEMENTATION-SUMMARY.md`

---

## ✅ Ready!

That's it! Every submission now automatically:
1. ✅ Creates Octave workspace
2. ✅ Generates professional PDF
3. ✅ Uploads to Monday.com

**Takes ~5 minutes to set up. Works forever.** 🎉

