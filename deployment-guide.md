# Deployment Guide: Running Online

## Option 1: Vercel (Recommended)

### Prerequisites
- GitHub/GitLab account
- Vercel account (free)
- Supabase project (already set up)
- OpenAI API key

### Steps

1. **Push to GitHub:**
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

2. **Deploy to Vercel:**
- Go to [vercel.com](https://vercel.com)
- Sign up/login with GitHub
- Click "New Project"
- Import your GitHub repository
- Vercel will auto-detect Next.js configuration

3. **Environment Variables:**
In Vercel dashboard → Project Settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-proj-your-openai-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. **Supabase Configuration:**
- Update Supabase Auth settings
- Add your Vercel domain to allowed origins
- Set up Google OAuth redirect URLs

### Vercel Configuration File

Create `vercel.json`:
```json
{
  "functions": {
    "app/api/*/route.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]
}
```

---

## Option 2: Netlify

### Steps
1. **Connect GitHub to Netlify**
2. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **Environment Variables:** Same as Vercel
4. **Functions:** Enable Edge Functions for API routes

---

## Option 3: Railway

### Steps
1. **Connect GitHub to Railway**
2. **Deploy:** Automatic detection of Next.js
3. **Environment Variables:** Add via Railway dashboard
4. **Custom Domain:** Available on paid plans

---

## Option 4: DigitalOcean App Platform

### Steps
1. **Create App from GitHub**
2. **Build Settings:** Auto-detected
3. **Environment Variables:** Add via dashboard
4. **Scaling:** Automatic with traffic

---

## Database Setup (Supabase)

### Required Tables
Run this SQL in Supabase SQL Editor:

```sql
-- Run the contents of memory-tables.sql
-- (Copy the SQL from the memory-tables.sql file we created)
```

### Authentication Setup
1. **Enable Google OAuth:**
   - Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your client ID and secret

2. **Update Redirect URLs:**
   - Add your production domain
   - Format: `https://your-domain.com/auth/callback`

3. **Site URL:**
   - Set to your production URL
   - Format: `https://your-domain.com`

---

## Production Optimizations

### 1. Environment-specific Configuration

Update `.env.local` → `.env.production`:
```env
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### 2. Build Optimizations

Add to `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  },
  images: {
    domains: ['your-domain.com', 'lh3.googleusercontent.com']
  },
  // Enable compression
  compress: true,
  // Optimize builds
  swcMinify: true
}

module.exports = nextConfig
```

### 3. Performance Monitoring

Add analytics (optional):
```bash
npm install @vercel/analytics
```

---

## Post-Deployment Checklist

- [ ] App loads correctly
- [ ] Google OAuth login works
- [ ] Chat functionality works
- [ ] File uploads work
- [ ] Memory system functions
- [ ] Canvas mode operates
- [ ] Web search functions
- [ ] Database saves messages
- [ ] HTTPS is enabled
- [ ] Custom domain configured (optional)

---

## Monitoring & Maintenance

### 1. Error Monitoring
- Vercel provides automatic error tracking
- Check Function logs in Vercel dashboard

### 2. Database Monitoring
- Monitor Supabase usage in dashboard
- Set up alerts for API limits

### 3. API Key Security
- Rotate OpenAI API keys regularly
- Monitor usage in OpenAI dashboard
- Set usage limits to prevent overages

---

## Costs (Approximate Monthly)

### Free Tier:
- **Vercel:** Free (100GB bandwidth, 1000 serverless function invocations)
- **Supabase:** Free (500MB database, 50MB file storage)
- **OpenAI:** Pay-per-use (typically $5-20/month for moderate usage)

### Paid Plans:
- **Vercel Pro:** $20/month (unlimited bandwidth, more functions)
- **Supabase Pro:** $25/month (8GB database, 100GB bandwidth)
- **Custom Domain:** $10-15/year

**Total Cost:** $0-50/month depending on usage

---

## Scaling Considerations

### High Traffic:
- Vercel automatically scales
- Consider Supabase Pro for more database capacity
- Monitor OpenAI API usage limits

### Enterprise:
- Vercel Enterprise plans
- Supabase Team/Enterprise
- OpenAI Enterprise API access