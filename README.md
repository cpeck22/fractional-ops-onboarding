# Fractional Ops Onboarding Web App

A streamlined client onboarding web application for Fractional Ops that integrates with Octave's workspace generation API.

## 🚀 Live Demo

- **Production**: https://revops-onboarding-fractionalops-333h3ivny.vercel.app (live Vercel URL)
- **Custom Domain**: gtmonboarding.fractionalops.com (pending DNS configuration)

## Features

- **Secure Login**: Username/password authentication for clients
- **Multi-Step Questionnaire**: 13 comprehensive sections covering all aspects of client onboarding
- **Review & Confirmation**: Clean summary page before submission
- **Octave Integration**: Automatic workspace creation via API
- **Thank You Page**: CEO video and HubSpot booking integration
- **Fractional Ops Branding**: Professional, clean design aligned with brand guidelines

## Tech Stack

- **Frontend**: Next.js 14 with React 18
- **Styling**: Tailwind CSS with custom Fractional Ops theme
- **Forms**: React Hook Form for form management
- **State Management**: React Context for questionnaire data
- **Notifications**: React Hot Toast
- **API Integration**: Axios for Octave API calls
- **TypeScript**: Full type safety throughout
- **Deployment**: Vercel with GitHub Actions CI/CD

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Octave API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/fractional-ops-onboarding.git
   cd fractional-ops-onboarding
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   Add your Octave API key to `.env.local`:
   ```
   OCTAVE_API_KEY=your-octave-api-key-here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Login Credentials

### Primary Client Login
- **Email**: `revops.client@fractionalops.com`
- **Password**: `FractionalOps`

### Demo Login
- **Email**: `client@fractionalops.com`
- **Password**: `onboarding2024`

## Project Structure

```
fractional-ops-onboarding/
├── app/                    # Next.js app directory
│   ├── page.tsx          # Login page
│   ├── questionnaire/    # Multi-step questionnaire
│   ├── review/          # Review and submit page
│   ├── thank-you/       # Thank you page with video & booking
│   ├── api/             # API routes
│   └── layout.tsx       # Root layout with providers
├── components/          # Reusable React components
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── QuestionnaireForm.tsx
│   └── QuestionnaireProvider.tsx
├── lib/                 # API utilities
│   └── api.ts          # Octave API integration
├── types/              # TypeScript type definitions
│   └── index.ts
└── styles/             # Global styles and Tailwind config
```

## Questionnaire Sections

The onboarding form includes 13 comprehensive sections:

1. **Company Information** - Company name and domain (required)
2. **ICP (Ideal Customer Profile)** - Define target customers
3. **ICP Segments** - Break down customer segments
4. **Reasons to Buy** - Understand purchase drivers
5. **Dream Outcome** - Define ideal client results
6. **Problems & Barriers** - Identify common obstacles
7. **Your Solutions** - Describe solution approach
8. **Time Delay** - Timeline and deployment expectations
9. **Measurements** - How clients measure success
10. **KPIs & Current Results** - Current performance metrics
11. **Existing Tech Stack** - Current technology infrastructure
12. **Team Members** - Organizational structure and roles
13. **Outbound GTM Readiness** - Go-to-market readiness assessment

## API Integration

### Octave Workspace Creation

The app integrates with Octave's workspace generation API:

- **Endpoint**: `https://app.octavehq.com/api/v2/agents/workspace/build`
- **Method**: POST
- **Authentication**: API key in headers
- **Payload**: Questionnaire data formatted for Octave

### HubSpot Booking Integration

The thank-you page includes HubSpot's meeting embed:

```html
<div class="meetings-iframe-container" 
     data-src="https://meetings.hubspot.com/corey-peck/gtm-kickoff-corey-ali?embed=true">
</div>
```

## Deployment

### Production Deployment (Vercel)

The app is automatically deployed to Vercel on every push to the main branch:

1. **Automatic Build**: GitHub Actions triggers build on push
2. **Environment Variables**: Set in Vercel dashboard
3. **Custom Domain**: Configured for gtmonboarding.fractionalops.com
4. **SSL Certificate**: Automatically provisioned by Vercel

### Environment Variables

Set these in your Vercel dashboard:

```
OCTAVE_API_KEY=your-production-octave-api-key
NEXT_PUBLIC_APP_NAME=Fractional Ops Onboarding
NEXT_PUBLIC_COMPANY_NAME=Fractional Ops
```

## Development Workflow

### Branch Strategy
- `main` → Production deployment
- `develop` → Staging deployment
- `feature/*` → Feature development

### Local Development
1. Create feature branch from `develop`
2. Make changes locally
3. Test on localhost:3000
4. Create pull request
5. Review and merge to `develop`
6. Deploy to staging for testing
7. Merge to `main` for production

## Customization

### Branding
- Colors: Update `tailwind.config.js` with your brand colors
- Logo: Replace the "FO" logo in components
- Fonts: Modify `layout.tsx` to use your brand fonts

### Questionnaire
- Fields: Add/modify fields in `QuestionnaireForm.tsx`
- Sections: Update section definitions in `questionnaire/page.tsx`
- Validation: Add form validation rules as needed

### API Integration
- Modify `lib/api.ts` to integrate with additional APIs
- Update type definitions in `types/index.ts` as needed

## Support

For questions or issues:
- Email: support@fractionalops.com
- Documentation: [Fractional Ops Documentation](https://docs.fractionalops.com)

## License

Proprietary - Fractional Ops Internal Use Only