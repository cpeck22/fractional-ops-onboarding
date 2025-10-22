# Fractional Ops Onboarding App - Setup Instructions

## 🚀 Authentication & Real-time Data Persistence Setup

This app now includes:
- ✅ **Email-based authentication** with Supabase
- ✅ **Real-time questionnaire data saving** (auto-saves as users type)
- ✅ **User-specific data isolation** (each user's data is private)
- ✅ **Resume capability** (users can leave and continue where they left off)
- ✅ **Internal admin dashboard** for viewing all questionnaire submissions

## 📋 Prerequisites

1. **Supabase Account**: You already have access to [https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej](https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej)
2. **Node.js**: Version 18+ installed
3. **Git**: For version control

## 🔧 Setup Steps

### Step 1: Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej)
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **Project URL** (looks like: `https://wmvccwxvtwhtlrltbnej.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...` - keep this secret!)

### Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql` 
3. Click **Run** to create the necessary tables and policies

### Step 3: Configure Environment Variables

Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wmvccwxvtwhtlrltbnej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Octave API (existing)
OCTAVE_API_KEY=your-octave-api-key

# Zapier Webhook (for PDF delivery to Monday.com)
ZAPIER_WEBHOOK_URL=your-zapier-webhook-url-here
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to test the authentication system.

## 🎯 Features Implemented

### Authentication System
- **Email/Password Signup**: Users can create accounts with email verification
- **Email/Password Login**: Secure authentication with session management
- **Automatic Session Handling**: Users stay logged in across browser sessions
- **Password Reset**: Users can reset forgotten passwords

### Real-time Data Persistence
- **Auto-save**: Questionnaire data saves automatically 2 seconds after user stops typing
- **User Isolation**: Each user's data is completely separate and secure
- **Resume Capability**: Users can leave and return to continue where they left off
- **Visual Feedback**: "Saving..." indicator shows when data is being saved

### Admin Dashboard
- **Internal Access**: View all questionnaire submissions at `/admin`
- **User Management**: See all registered users and their completion status
- **Data Export**: Access to all questionnaire responses for analysis

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level security ensuring users can only access their own data
- **Secure Authentication**: Supabase handles all security best practices
- **Environment Variables**: Sensitive keys are kept secure and not exposed to client
- **Protected Routes**: Questionnaire pages require authentication

## 📊 Database Schema

### Tables Created:
- `user_profiles`: Stores user information and metadata
- `questionnaire_responses`: Stores individual questionnaire field responses
- **Automatic Triggers**: User profiles are created automatically on signup

### Security Policies:
- Users can only view/edit their own data
- Admin access controlled through Supabase RLS
- All database operations are secure by default

## 🚀 Deployment

The app is ready for deployment to Vercel:

1. Push your changes to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📱 User Experience

### For Clients (CEOs):
1. **Sign Up**: Create account with email/password
2. **Fill Questionnaire**: Data saves automatically as they type
3. **Resume Anytime**: Can leave and return to continue
4. **Submit**: Complete questionnaire and get results

### For Internal Team:
1. **Admin Dashboard**: Access at `/admin` route
2. **View All Submissions**: See all client questionnaire data
3. **User Management**: Track completion status
4. **Data Analysis**: Export data for analysis

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Check your Supabase credentials in `.env.local`
2. **"User not found"**: Ensure database schema was created successfully
3. **"Permission denied"**: Check RLS policies in Supabase dashboard
4. **Data not saving**: Verify Supabase connection and user authentication

### Debug Steps:
1. Check browser console for errors
2. Verify environment variables are loaded
3. Check Supabase dashboard for database errors
4. Ensure user is properly authenticated

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Supabase credentials
3. Ensure the database schema was created successfully
4. Check that all environment variables are properly set

The authentication system is now fully integrated and ready for production use! 🎉
