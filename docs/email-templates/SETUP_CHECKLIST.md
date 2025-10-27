# Custom Email Setup Checklist

Use this checklist to track your progress setting up custom verification emails from Claire@fractionalops.com.

## Phase 1: Microsoft 365 Setup

### SMTP Authentication
- [ ] Logged into Microsoft 365 Admin Center
- [ ] Navigated to Settings > Org settings > Modern authentication
- [ ] Verified "Authenticated SMTP" is enabled
- [ ] Saved changes

### App Password Generation
- [ ] Logged into account.microsoft.com/security as Claire@fractionalops.com
- [ ] Navigated to Security > Advanced security options
- [ ] Created new App Password named "Supabase Auth Emails"
- [ ] Copied the 16-character password
- [ ] Stored password securely (password manager or secure note)

### SMTP Details Confirmed
```
✓ SMTP Server: smtp.office365.com
✓ Port: 587
✓ Security: TLS/STARTTLS
✓ Username: Claire@fractionalops.com
✓ Password: [16-char App Password]
```

---

## Phase 2: Supabase Configuration

### Dashboard Access
- [ ] Logged into app.supabase.com
- [ ] Selected project: fractional-ops-onboarding
- [ ] Navigated to Project Settings

### SMTP Setup
- [ ] Went to Project Settings > Auth tab
- [ ] Found "SMTP Settings" section
- [ ] Enabled "Custom SMTP"
- [ ] Entered:
  - [ ] Sender email: Claire@fractionalops.com
  - [ ] Sender name: Claire from Fractional Ops
  - [ ] Host: smtp.office365.com
  - [ ] Port: 587
  - [ ] Username: Claire@fractionalops.com
  - [ ] Password: [App Password]
  - [ ] Enable TLS: Yes
- [ ] Clicked Save
- [ ] Received success confirmation

### SMTP Connection Test
- [ ] Found "Send test email" button
- [ ] Entered test email address: ________________
- [ ] Clicked "Send test email"
- [ ] Received test email from Claire@fractionalops.com
- [ ] Email not in spam folder
- [ ] ✅ SMTP connection working!

---

## Phase 3: Email Templates

### Confirm Signup Template
- [ ] Navigated to Authentication > Email Templates
- [ ] Selected "Confirm signup" template
- [ ] Updated subject line: "Verify your email - Fractional Ops Onboarding"
- [ ] Copied HTML from `docs/email-templates/confirm-signup.html`
- [ ] Pasted into Supabase template editor
- [ ] Updated logo URL (see Phase 4)
- [ ] Clicked Save
- [ ] Used Preview button to verify appearance

### Reset Password Template (Optional)
- [ ] Selected "Reset Password" template
- [ ] Updated subject line: "Reset your password - Fractional Ops"
- [ ] Copied HTML from `docs/email-templates/reset-password.html`
- [ ] Updated logo URL
- [ ] Clicked Save
- [ ] Previewed template

### Magic Link Template (Optional - if using passwordless)
- [ ] Selected "Magic Link" template
- [ ] Customized with same branding
- [ ] Updated logo URL
- [ ] Clicked Save

---

## Phase 4: Logo Setup

### Choose Logo Hosting Option
**Option selected:** ☐ Vercel Deployment  ☐ Supabase Storage

### Option A: Vercel Deployment
- [ ] App deployed to Vercel
- [ ] Logo accessible at: `https://___________.vercel.app/Fractional-Ops_Symbol_Main.png`
- [ ] Tested URL in browser - logo loads
- [ ] Updated URL in email templates

### Option B: Supabase Storage
- [ ] Navigated to Storage in Supabase
- [ ] Created bucket: "public-assets"
- [ ] Made bucket public
- [ ] Uploaded: Fractional-Ops_Symbol_Main.png
- [ ] Copied public URL: ______________________
- [ ] Tested URL in browser - logo loads
- [ ] Updated URL in email templates

---

## Phase 5: Testing

### Initial Email Test
- [ ] Signed out of app
- [ ] Went to /signup page
- [ ] Created test account with email: ________________
- [ ] Checked inbox for verification email
- [ ] Email received from Claire@fractionalops.com
- [ ] Subject line correct
- [ ] Logo displays correctly
- [ ] Blue/purple gradient colors show correctly
- [ ] Claire's signature appears
- [ ] "Verify Email" button displays properly

### Link Functionality
- [ ] Clicked verification link in email
- [ ] Redirected to app successfully
- [ ] Account activated
- [ ] Able to sign in
- [ ] ✅ Email flow working end-to-end!

### Email Client Testing
Test email display in multiple clients:
- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Outlook (web)
- [ ] Outlook (desktop)
- [ ] Apple Mail (Mac)
- [ ] Apple Mail (iPhone)
- [ ] Other: ________________

### Mobile Responsive Testing
- [ ] Forwarded email to mobile device
- [ ] Email layout looks good on mobile
- [ ] Text is readable
- [ ] Button is tappable
- [ ] Logo displays properly
- [ ] Links work on mobile

### Password Reset Test (if customized)
- [ ] Went to signin page
- [ ] Clicked "Forgot password"
- [ ] Entered test email
- [ ] Received reset email from Claire@fractionalops.com
- [ ] Email has correct branding
- [ ] Reset link works
- [ ] Successfully reset password

---

## Phase 6: Production Readiness

### Security Checklist
- [ ] App Password NOT committed to git
- [ ] App Password stored securely
- [ ] MFA enabled on Claire@fractionalops.com
- [ ] SMTP credentials only in Supabase (encrypted)
- [ ] No passwords in .env.local file

### Performance Checklist
- [ ] Logo file size < 200KB
- [ ] Email template < 100KB total
- [ ] No external font loading (uses system fonts)
- [ ] No excessive images

### Compliance Checklist
- [ ] Email includes company name
- [ ] Email includes sender address
- [ ] Email includes unsubscribe info (if required)
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

### Documentation
- [ ] Team knows where SMTP credentials are stored
- [ ] Backup contact has access to Microsoft 365 admin
- [ ] Email template files backed up in repo
- [ ] This checklist completed and filed

---

## Monitoring & Maintenance

### Post-Launch
- [ ] Monitor Microsoft 365 email sending reports (first week)
- [ ] Check spam complaint rate
- [ ] Monitor delivery rate (should be >95%)
- [ ] No user complaints about email delivery
- [ ] Set calendar reminder to rotate App Password (quarterly)

### Email Volume Monitoring
Current Microsoft 365 sending limits:
- Business Account: 10,000 emails/day
- 30 emails per minute

- [ ] Documented current email volume: ______ emails/day
- [ ] Set up alert if approaching 80% of limit
- [ ] Plan to upgrade if needed

---

## Sign-Off

**Setup Completed By:** ________________  
**Date:** ________________  
**Email Test Account Used:** ________________  
**Logo URL Used:** ________________  

**Notes:**
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________

---

## Quick Reference

**Microsoft 365 SMTP:**
```
smtp.office365.com:587 (TLS)
Claire@fractionalops.com
[App Password stored in: ________________]
```

**Supabase Project:**
```
Project: fractional-ops-onboarding
Settings: Project Settings > Auth > SMTP Settings
Templates: Authentication > Email Templates
```

**Support Links:**
- [Microsoft 365 Admin](https://admin.microsoft.com)
- [Microsoft Account Security](https://account.microsoft.com/security)  
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp)


