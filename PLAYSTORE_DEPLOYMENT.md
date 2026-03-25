# Play Store Deployment Guide for Vitu PWA

This guide will help you deploy the Vitu PWA to the Google Play Store.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Google Play Console Account** ($25 one-time fee)
2. **PWA Builder Account** (free) at [pwabuilder.com](https://pwabuilder.com)
3. **Node.js** installed (v18 or higher)
4. **All required assets** (see checklist below)

## ✅ Pre-Deployment Checklist

### Required Assets

- [ ] **App Icon (512x512 PNG)**
  - Must be square
  - No transparency
  - No rounded corners (Play Store handles this)
  - Place in `public/icon-512.png`

- [ ] **Feature Graphic (1024x500 PNG)**
  - Used in Play Store listing
  - Should showcase app branding
  - Place in `public/feature-graphic.png`

- [ ] **Screenshots (Phone)**
  - Minimum: 2 screenshots
  - Maximum: 8 screenshots
  - Dimensions: 1080x1920 to 3840x7680
  - Place in `screenshots/phone/`

- [ ] **Screenshots (7" Tablet)**
  - Minimum: 1 screenshot
  - Maximum: 8 screenshots
  - Dimensions: 1200x1920 to 3840x7680
  - Place in `screenshots/tablet7/`

- [ ] **Screenshots (10" Tablet)**
  - Minimum: 1 screenshot
  - Maximum: 8 screenshots
  - Dimensions: 1200x1920 to 3840x7680
  - Place in `screenshots/tablet10/`

- [ ] **Promo Graphic (180x120 PNG)**
  - Used in promotional content
  - Place in `public/promo-graphic.png`

### Required Pages

- [x] **Privacy Policy** - Available at `/privacy`
- [x] **Terms of Service** - Available at `/terms`

### PWA Requirements

- [x] **Web App Manifest** - `public/manifest.json`
- [x] **Service Worker** - `public/sw.js`
- [x] **HTTPS** - Required for production
- [x] **Responsive Design** - Works on all screen sizes

## 🚀 Step-by-Step Deployment

### Step 1: Generate PWA Icons

```bash
# Install sharp for icon generation
npm install

# Generate all required icon sizes
npm run generate-icons
```

This will create all required icon sizes in the `public/` directory.

### Step 2: Build the PWA

```bash
# Build for production
npm run build
```

This creates the `dist/` folder with your production-ready PWA.

### Step 3: Deploy to Hosting

Deploy your PWA to a hosting service that supports HTTPS:

**Option A: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Option B: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Option C: Firebase Hosting**
```bash
# Install Firebase CLI
npm i -g firebase-tools

# Initialize and deploy
firebase init hosting
firebase deploy --only hosting
```

### Step 4: Create Android APK with PWA Builder

1. Go to [pwabuilder.com](https://pwabuilder.com)
2. Enter your PWA URL (e.g., `https://vitu.app`)
3. Click "Package for Stores"
4. Select "Android" platform
5. Configure settings:
   - **Package ID**: `app.vitu.android`
   - **App Name**: Vitu
   - **App Version**: 1.0.0
   - **Host**: vitu.app
   - **Start URL**: /
   - **Theme Color**: #10b981
   - **Background Color**: #ffffff
   - **Icon URL**: https://vitu.app/icon-512.png
6. Click "Generate Package"
7. Download the `.aab` file (Android App Bundle)

### Step 5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create Application"
3. Select default language: English (United States)
4. Enter app name: "Vitu - Business Showcase"
5. Click "Create"

### Step 6: Complete Store Listing

1. **App Details**
   - Short description: (80 characters max)
   - Full description: (4000 characters max)
   - Screenshots: Upload all required screenshots
   - Feature graphic: Upload 1024x500 image
   - App icon: Upload 512x512 icon

2. **Content Rating**
   - Complete the content rating questionnaire
   - Select "Everyone" rating

3. **Pricing & Distribution**
   - Select "Free"
   - Choose distribution countries
   - Accept content guidelines

4. **Privacy Policy**
   - Enter URL: `https://vitu.app/privacy`

5. **App Category**
   - Category: Business
   - Tags: business, showcase, marketplace

### Step 7: Upload APK/AAB

1. Go to "Release" → "Production"
2. Click "Create New Release"
3. Upload the `.aab` file from PWA Builder
4. Enter release notes
5. Click "Review Release"
6. Click "Start Rollout to Production"

### Step 8: Submit for Review

1. Review all sections for completeness
2. Click "Send for Review"
3. Wait for Google's review (typically 1-7 days)

## 📝 Play Store Listing Content

### Short Description (80 chars)
```
Discover and connect with amazing businesses. Showcase your products.
```

### Full Description
See `play-store-metadata.json` for the complete description.

### Keywords
- business showcase
- marketplace
- business directory
- product showcase
- business networking
- local business
- business reviews
- business analytics

## 🔧 Troubleshooting

### Common Issues

**Issue: "Web manifest not found"**
- Solution: Ensure `manifest.json` is in the `public/` folder and accessible at `/manifest.json`

**Issue: "Service worker not registered"**
- Solution: Check that `sw.js` is in the `public/` folder and the registration script is in `index.html`

**Issue: "Icons not loading"**
- Solution: Run `npm run generate-icons` to create all required icon sizes

**Issue: "Privacy policy URL not accessible"**
- Solution: Ensure `/privacy` route is deployed and accessible

**Issue: "Screenshots don't match app"**
- Solution: Take new screenshots from the actual app on different devices

### PWA Validation

Test your PWA before submission:

1. **Lighthouse Audit**
   - Open Chrome DevTools
   - Go to "Lighthouse" tab
   - Select "Progressive Web App"
   - Click "Generate report"
   - Aim for 100% PWA score

2. **PWA Builder Validator**
   - Go to [pwabuilder.com](https://pwabuilder.com)
   - Enter your URL
   - Check for any warnings or errors

3. **Manual Testing**
   - Test on Android device
   - Test "Add to Home Screen" functionality
   - Test offline functionality
   - Test push notifications

## 📊 Post-Launch Checklist

After your app is live:

- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Track install and uninstall rates
- [ ] Monitor app performance metrics
- [ ] Update app regularly with new features
- [ ] Maintain privacy policy and terms of service
- [ ] Keep screenshots and descriptions up to date

## 🔗 Useful Links

- [Google Play Console](https://play.google.com/console)
- [PWA Builder](https://pwabuilder.com)
- [Play Store Listing Best Practices](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Lighthouse PWA Audit](https://web.dev/lighthouse-pwa/)

## 📞 Support

For issues or questions:
- Email: support@vitu.app
- Website: https://vitu.app

---

**Last Updated**: 2026-03-25
**Version**: 1.0.0
