# Custom Branding Implementation Guide

## Phase 1: Visual Identity (Start Here)

### 1. Logo & Brand Assets
Create these files in `/public/`:
```
/public/logo.svg          # Main logo
/public/logo-white.svg    # White version for dark backgrounds
/public/favicon.ico       # Browser tab icon
/public/apple-touch-icon.png  # Mobile home screen
/public/og-image.png      # Social media sharing image
```

### 2. Color Palette
Update `/src/styles/globals.css`:
```css
:root {
  /* Primary Brand Colors */
  --brand-primary: #your-primary-color;
  --brand-secondary: #your-secondary-color;
  --brand-accent: #your-accent-color;
  
  /* Update existing colors */
  --blue-600: var(--brand-primary);
  --blue-700: var(--brand-primary-dark);
  --purple-600: var(--brand-secondary);
}
```

### 3. Typography
Add custom fonts in `/src/app/layout.tsx`:
```typescript
import { Inter, YourCustomFont } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const customFont = YourCustomFont({ subsets: ['latin'] })
```

## Phase 2: UI Components (Week 1)

### 1. Header/Navigation Branding
Update `/src/components/layout/app-layout.tsx`:
```typescript
// Add your logo and brand name
<div className="flex items-center gap-3">
  <img src="/logo.svg" alt="Your Brand" className="w-8 h-8" />
  <div>
    <h1 className="text-lg font-bold text-brand-primary">Your App Name</h1>
    <p className="text-sm text-gray-600">Your tagline here</p>
  </div>
</div>
```

### 2. Login Page Branding
Update `/src/app/login/page.tsx`:
- Add your logo
- Customize welcome message
- Update button colors to match brand

### 3. Chat Interface
- Customize message bubble colors
- Add branded empty state
- Update loading animations

## Phase 3: Content & Messaging (Week 2)

### 1. App Metadata
Update `/src/app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'Your App Name - AI Assistant',
  description: 'Your custom description',
  keywords: 'AI, chatbot, your-industry',
  authors: [{ name: 'Your Company' }],
  openGraph: {
    title: 'Your App Name',
    description: 'Your description',
    images: ['/og-image.png'],
  },
}
```

### 2. Welcome Messages
- Customize empty chat state
- Update system prompts with your brand voice
- Add branded error messages

### 3. Help & Documentation
- Add branded help content
- Create custom onboarding flow
- Add tooltips with your brand voice

## Phase 4: Advanced Branding (Week 3-4)

### 1. Custom Domain
```bash
# Set up custom domain in Vercel
your-app-name.com
```

### 2. White-label Features
- Remove "Claude Code" references
- Add your company info in footers
- Customize email templates (if any)

### 3. Feature Customization
- Rename "Memory" to your preferred term
- Customize folder/chat organization terms
- Add industry-specific language

## Implementation Files

### 1. Brand Configuration
Create `/src/config/brand.ts`:
```typescript
export const brandConfig = {
  name: 'Your App Name',
  tagline: 'Your tagline',
  description: 'Your app description',
  colors: {
    primary: '#your-color',
    secondary: '#your-color',
    accent: '#your-color'
  },
  fonts: {
    heading: 'Your Font',
    body: 'Your Font'
  },
  logo: {
    main: '/logo.svg',
    white: '/logo-white.svg',
    icon: '/favicon.ico'
  },
  contact: {
    email: 'support@yourapp.com',
    website: 'https://yourapp.com'
  }
}
```

### 2. Theme Provider
Create `/src/components/theme/theme-provider.tsx`:
```typescript
'use client'

import { createContext, useContext } from 'react'
import { brandConfig } from '@/config/brand'

const ThemeContext = createContext(brandConfig)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={brandConfig}>
      <div style={{ 
        '--brand-primary': brandConfig.colors.primary,
        '--brand-secondary': brandConfig.colors.secondary 
      } as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

## Deployment Considerations

### 1. Environment Variables
Add to your deployment:
```env
NEXT_PUBLIC_BRAND_NAME="Your App Name"
NEXT_PUBLIC_BRAND_URL="https://yourapp.com"
NEXT_PUBLIC_SUPPORT_EMAIL="support@yourapp.com"
```

### 2. SEO & Analytics
- Set up Google Analytics with your brand
- Configure search console
- Add structured data for your brand

### 3. Legal Pages
Create:
- `/src/app/privacy/page.tsx` - Privacy Policy
- `/src/app/terms/page.tsx` - Terms of Service
- `/src/app/about/page.tsx` - About page

## Quick Start Checklist (This Week)

Priority order for immediate branding:

- [ ] Replace default colors with your brand colors
- [ ] Add your logo to header and login page
- [ ] Update app name and tagline
- [ ] Customize favicon and meta tags
- [ ] Update login page messaging
- [ ] Test on mobile devices
- [ ] Deploy to production with custom domain

## Cost Considerations

### Free Branding:
- Logo design (if you do it yourself)
- Color scheme updates
- Basic customization

### Paid Branding:
- Professional logo design: $200-500
- Custom domain: $10-15/year
- Professional design consultation: $500-2000
- Custom illustrations/graphics: $300-1000

## Timeline

- **Week 1:** Visual identity, colors, logo
- **Week 2:** UI components, messaging
- **Week 3:** Advanced features, custom domain
- **Week 4:** Polish, testing, launch

The foundation is solid - perfect time to make it uniquely yours!