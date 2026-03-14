# HireSchema Local Development Setup

## ✅ Prerequisites
- Node.js (v18 or higher)
- npm or yarn

## 🔧 Environment Variables Setup

All required environment variables have been configured in `.env.local`:

### AI Services
- ✅ `OPENAI_API_KEY` - Server-side ChatGPT API for resume analysis/content generation

### Dodo Payments
- ✅ `VITE_DODO_PRODUCT_ID` - Product ID for payments
- ✅ `DODO_PAYMENTS_API_KEY` - Backend payment verification
- ✅ `DODO_ENV` - Payment environment (live)
- ✅ `VITE_DODO_ENV` - Frontend payment environment (live)

### Blog
- ✅ `MASSBLOG_URL` - Massblog base URL
- ✅ `MASSBLOG_API` - Server-side Massblog API key

## 🚀 Running the App

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Local: http://localhost:3001/
   - Network: http://192.168.1.13:3001/

## 🧪 Testing

Run tests to ensure everything is working:
```bash
npm test
```

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` - your API keys are secure
- ✅ All sensitive keys are properly configured
- ✅ Sensitive keys stay server-side and are not exposed in client bundles

## 📱 Features Available

- ✅ Resume analysis with ChatGPT
- ✅ Content generation with ChatGPT
- ✅ Payment processing with Dodo Payments
- ✅ Roast My Resume feature
- ✅ ATS optimization
- ✅ PDF generation and download

## 🐛 Troubleshooting

If you encounter issues:

1. **API Key Issues:**
   - Check that all keys in `.env.local` are correct
   - Restart the dev server after changing environment variables

2. **Payment Issues:**
   - Ensure `VITE_DODO_ENV=live` for production payments
   - Check that product ID matches your Dodo dashboard

3. **Build Issues:**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear Vite cache: `rm -rf .vite`

## 🎯 All Set!

Your app should now be running smoothly with all features enabled. The environment is configured for production-level functionality with live payment processing.
