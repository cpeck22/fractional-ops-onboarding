# 🎥 Public Video Setup Instructions

## Overview
The `/results` page displays an intro video in the `SectionIntro` component for each output section. This video requires a **publicly accessible URL** (no authentication required).

---

## 🚀 Quick Setup

### Step 1: Upload Video to Public Platform

Choose one of these options:

#### **Option A: YouTube (Recommended)**
1. Upload your video to YouTube
2. Set visibility to **"Unlisted"** (not searchable but accessible via link)
3. Copy the video ID from the URL: `https://www.youtube.com/watch?v=VIDEO_ID`
4. Use this format: `https://www.youtube.com/embed/VIDEO_ID`

**Example:**
```
https://www.youtube.com/embed/dQw4w9WgXcQ
```

#### **Option B: Vimeo**
1. Upload video to Vimeo
2. Go to video settings → Privacy → Set to **"Anyone"** or **"Only people with a link"**
3. Copy the video ID
4. Use this format: `https://player.vimeo.com/video/VIDEO_ID`

**Example:**
```
https://player.vimeo.com/video/123456789
```

#### **Option C: AWS S3 / Cloudflare R2**
1. Upload video to your CDN
2. Set bucket permissions to public
3. Use the direct MP4 URL

**Example:**
```
https://your-cdn.com/videos/intro-video.mp4
```

---

### Step 2: Add to Environment Variables

#### **Local Development (.env.local)**

Create or edit `.env.local` in your project root:

```bash
NEXT_PUBLIC_INTRO_VIDEO_URL=https://www.youtube.com/embed/YOUR_VIDEO_ID
```

#### **Vercel Production**

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `NEXT_PUBLIC_INTRO_VIDEO_URL`
   - **Value:** `https://www.youtube.com/embed/YOUR_VIDEO_ID`
4. Click "Save"
5. Redeploy your app (or wait for next deployment)

---

## 🎯 What This Changes

### ✅ Updated Components:

1. **`SectionIntro.tsx`** (Section Headers)
   - Shows video in ALL section intros on `/results`
   - Campaign Ideas, Qualified Prospects, Cold Emails, etc.
   - Uses `NEXT_PUBLIC_INTRO_VIDEO_URL` environment variable

2. **`ErrorPlaceholder`** (Error State)
   - **Video REMOVED** (per your request)
   - Now shows clean "Need more context" message only

---

## 🔍 Current Configuration

**Current Video URL (Fallback):**
```
https://www.youtube.com/embed/dQw4w9WgXcQ
```

This is a **placeholder** that will display until you set your custom video URL.

---

## 📝 Testing

### Local Testing:
```bash
# 1. Add video URL to .env.local
echo "NEXT_PUBLIC_INTRO_VIDEO_URL=https://www.youtube.com/embed/YOUR_VIDEO_ID" >> .env.local

# 2. Restart dev server
npm run dev

# 3. Visit http://localhost:3000/results
# Video should play without authentication
```

### Production Testing:
1. Add env var to Vercel
2. Trigger new deployment
3. Visit your production `/results` page
4. Verify video plays without "Sign in" prompt

---

## 🛠️ Troubleshooting

### Issue: "Please sign in to view this file"
**Cause:** Video requires authentication (e.g., SharePoint, private Google Drive)  
**Fix:** Use YouTube unlisted or Vimeo with public sharing enabled

### Issue: Video not loading
**Cause:** Invalid URL or CORS restrictions  
**Fix:** Verify URL works in incognito browser, check CORS headers if self-hosting

### Issue: Video not updating after env var change
**Cause:** Next.js caches environment variables  
**Fix:** Restart dev server (local) or trigger new deployment (Vercel)

---

## 🎬 Recommended Video Specs

- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080 (1080p) or 1280x720 (720p)
- **Aspect Ratio:** 16:9
- **Duration:** 30-90 seconds (intro video)
- **File Size:** < 50MB (for faster loading)

---

## 📞 Support

If you need help setting up the public video:
1. Ensure video is uploaded to YouTube/Vimeo
2. Verify sharing settings allow public access
3. Copy the embed URL (not the watch URL)
4. Add to Vercel environment variables
5. Redeploy

---

**Last Updated:** November 27, 2024  
**Modified By:** Cursor AI Assistant

