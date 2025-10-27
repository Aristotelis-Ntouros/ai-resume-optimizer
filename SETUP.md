# AI Resume & LinkedIn Optimizer - Setup Guide

## Prerequisites
- Node.js 18+ installed
- Vercel account (aristotelis-ntouros)
- Supabase account
- OpenAI API key

## 1. Supabase Database Setup

### Create a Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and anon key

### Create Database Tables

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create users table (handled by Supabase Auth)
-- No need to create manually

-- Create rewrites table
CREATE TABLE rewrites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  rewritten_text TEXT NOT NULL,
  type TEXT CHECK (type IN ('cv', 'linkedin')) DEFAULT 'cv',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE rewrites ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own rewrites
CREATE POLICY "Users can view their own rewrites"
  ON rewrites FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own rewrites
CREATE POLICY "Users can insert their own rewrites"
  ON rewrites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX rewrites_user_id_idx ON rewrites(user_id);
CREATE INDEX rewrites_created_at_idx ON rewrites(created_at DESC);
```

## 2. Environment Variables

### Update src/environments/environment.ts

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY',
  openaiApiKey: 'YOUR_OPENAI_API_KEY'
};
```

### Vercel Environment Variables

Set these in your Vercel project settings or via CLI:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## 3. Install Dependencies

```bash
npm install
cd api && npm install && cd ..
```

## 4. Local Development

```bash
npm start
```

Visit http://localhost:4200

## 5. Deploy to Vercel

```bash
# Build the project
npm run build

# Deploy to Vercel
npx vercel deploy --token suTHyVShVosloYuPKfv7N6n2 --prod --yes
```

## 6. Set Vercel Environment Variables

After first deployment, set the environment variable:

```bash
npx vercel env add OPENAI_API_KEY --token suTHyVShVosloYuPKfv7N6n2
```

Then redeploy:

```bash
npx vercel deploy --token suTHyVShVosloYuPKfv7N6n2 --prod --yes
```

## Features

### Free Tier
- CV rewriting with AI
- LinkedIn headline & summary generation
- PDF download
- History of past rewrites
- Unlimited usage (rate-limited by OpenAI)

### Tech Stack
- **Frontend**: Angular 20+ with standalone components
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **File Processing**: mammoth (DOCX), jsPDF (PDF generation)
- **Auth**: Supabase Auth

## API Endpoints

### POST /api/rewrite
Rewrites CV text using AI
```json
{
  "text": "CV content here",
  "type": "cv"
}
```

### POST /api/linkedin
Generates LinkedIn content
```json
{
  "text": "CV content here"
}
```

## Troubleshooting

### CORS Errors
- Make sure API functions have proper CORS headers
- Check Vercel deployment logs

### Database Errors
- Verify RLS policies are correct
- Check Supabase logs

### Authentication Issues
- Verify Supabase URL and anon key
- Check email verification settings in Supabase Auth

## Next Steps for Production

1. Add rate limiting
2. Implement usage quotas
3. Add payment integration (Stripe)
4. Improve error handling
5. Add analytics
6. Implement A/B testing
7. Add more file format support
8. Improve mobile responsiveness
