# Custom Verification Email Setup Guide

**Goal:** Send verification emails from Claire@fractionalops.com with Fractional Ops branding

## Quick Links
- [Microsoft 365 Admin](https://admin.microsoft.com)
- [Microsoft Account Security](https://account.microsoft.com/security)
- [Supabase Dashboard](https://app.supabase.com)

---

## Phase 1: Microsoft 365 SMTP Setup

### Step 1: Enable SMTP AUTH in Microsoft 365
1. Log into [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Navigate to: **Settings** > **Org settings** > **Modern authentication**
3. Ensure **"Authenticated SMTP"** is enabled
4. Click **Save changes**

### Step 2: Generate App Password for Claire@fractionalops.com
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Sign in as **Claire@fractionalops.com**
3. Navigate to **Security** > **Advanced security options**
4. Under **"App passwords"**, click **"Create a new app password"**
5. Name it: `Supabase Auth Emails`
6. **Copy the generated password** (16-character code) - you'll need this for Supabase
7. **Save this password securely** - you won't be able to see it again

**Important Notes:**
- If App Passwords option is not available, your org may require admin to enable multi-factor authentication first
- This password provides full email access - keep it secure
- Never commit this password to git

### Step 3: SMTP Configuration Details
```
SMTP Server: smtp.office365.com
Port: 587
Security: TLS/STARTTLS
Username: Claire@fractionalops.com
Password: [App Password from Step 2]
```

---

## Phase 2: Supabase SMTP Configuration

### Step 4: Access Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select project: **fractional-ops-onboarding**
3. Navigate to: **Project Settings** (gear icon in sidebar)

### Step 5: Configure Custom SMTP
1. In Project Settings, go to: **Auth** tab
2. Scroll down to **"SMTP Settings"** section
3. Toggle **"Enable Custom SMTP"** to ON
4. Fill in the following:

```
Sender email: Claire@fractionalops.com
Sender name: Claire from Fractional Ops
Host: smtp.office365.com
Port: 587
Username: Claire@fractionalops.com
Password: [Paste App Password from Step 2]
Enable TLS: ✓ Yes
```

5. Click **"Save"**

### Step 6: Test SMTP Connection
1. Still in SMTP Settings section, find **"Send test email"** button
2. Enter your test email address
3. Click **"Send test email"**
4. Check your inbox - you should receive a test email from Claire@fractionalops.com
5. ✅ If successful, proceed to Phase 3
6. ❌ If failed, verify credentials and ensure SMTP AUTH is enabled in Step 1

---

## Phase 3: Customize Email Templates

### Step 7: Update Email Templates in Supabase
1. In Supabase Dashboard, navigate to: **Authentication** > **Email Templates**
2. You'll see several templates:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

### Step 8: Customize "Confirm Signup" Template

**Subject Line:**
```
Verify your email - Fractional Ops Onboarding
```

**HTML Template:**
Copy the content from `docs/email-templates/confirm-signup.html` in this project (see below)

Key customization points:
- Logo URL (line 139)
- Company colors (blue: #4F46E5, purple: #7C3AED)
- Claire's signature block
- Confirmation button styling

### Step 9: Test the Template
1. Click **"Save"** in Supabase
2. Use the **"Preview"** button to see how it looks
3. Adjust styling as needed

---

## Phase 4: Logo Setup

### Option A: Use Vercel Deployment (Recommended)
Once your app is deployed on Vercel, use:
```
https://your-vercel-domain.vercel.app/Fractional-Ops_Symbol_Main.png
```

### Option B: Use Supabase Storage
1. In Supabase Dashboard: **Storage**
2. Create bucket: `public-assets` (make it public)
3. Upload: `Fractional-Ops_Symbol_Main.png`
4. Copy the public URL
5. Update the logo URL in email template

### Step 10: Update Logo URL
In the email template, replace:
```html
<img src="https://your-domain.com/logo.png" alt="Fractional Ops" class="logo">
```

With your actual logo URL.

---

## Phase 5: Testing

### Complete Testing Checklist

#### SMTP Testing
- [ ] SMTP connection test successful
- [ ] Test email received from Claire@fractionalops.com
- [ ] Email not in spam folder

#### Email Template Testing
- [ ] Logo displays correctly
- [ ] Colors match branding (blue/purple gradient)
- [ ] Signature block shows correctly
- [ ] Verify Email button displays properly
- [ ] Confirmation link works

#### User Flow Testing
1. Sign out of app (if logged in)
2. Go to `/signup` page
3. Create test account with real email you can access
4. Check inbox for verification email
5. Click verification link
6. Verify it redirects to app correctly
7. ✅ Account is activated

#### Mobile Testing
- [ ] Email looks good on mobile (forward to phone)
- [ ] Button is tappable on mobile
- [ ] Text is readable on small screens

---

## Troubleshooting

### Issue: SMTP Connection Fails
**Solutions:**
- Verify App Password is correct (regenerate if needed)
- Ensure SMTP AUTH is enabled in Microsoft 365 Admin
- Check that Claire@fractionalops.com account has MFA enabled
- Verify Port 587 is not blocked by firewall

### Issue: Emails Go to Spam
**Solutions:**
- Add SPF record to fractionalops.com DNS:
  ```
  v=spf1 include:spf.protection.outlook.com ~all
  ```
- Add DKIM signing (requires Microsoft 365 admin setup)
- Ensure "From" address matches SMTP username

### Issue: Logo Doesn't Display
**Solutions:**
- Use absolute HTTPS URL (not relative path)
- Ensure image is publicly accessible (test URL in browser)
- Check image file size (keep under 200KB for emails)
- Verify no CORS restrictions

### Issue: App Password Not Available
**Solutions:**
- Enable Multi-Factor Authentication on Claire@fractionalops.com account
- Contact Microsoft 365 admin to enable App Passwords for organization
- Ensure account has proper licenses

---

## Production Checklist

Before announcing to users:

- [ ] SMTP configured and tested
- [ ] Email template customized with branding
- [ ] Logo displays correctly
- [ ] All email links work
- [ ] Tested on multiple email clients (Gmail, Outlook, Apple Mail)
- [ ] Tested on mobile devices
- [ ] SPF/DKIM records configured (optional but recommended)
- [ ] App Password stored securely (not in code)
- [ ] Documented for team

---

## Microsoft 365 Sending Limits

**Free/Basic Accounts:**
- 300 emails per day
- 30 emails per minute

**Business Accounts:**
- 10,000 emails per day
- 30 emails per minute

Monitor usage in Microsoft 365 admin if you approach these limits.

---

## Security Best Practices

1. **Never commit SMTP credentials to git**
2. **Use App Passwords, not main account password**
3. **Enable MFA on Claire@fractionalops.com**
4. **Regularly rotate App Passwords (quarterly)**
5. **Monitor email sending activity in Microsoft 365 admin**
6. **Keep Supabase project settings secure**

---

## Need Help?

- Microsoft 365 Support: [support.microsoft.com](https://support.microsoft.com)
- Supabase Documentation: [supabase.com/docs/guides/auth/auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)
- Email Template Testing: [litmus.com](https://litmus.com) or [emailonacid.com](https://emailonacid.com)


