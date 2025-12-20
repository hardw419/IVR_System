# Quick Start Guide

Get your AI Voice IVR System up and running in 10 minutes!

## Prerequisites

You need:
- Node.js 18+ installed
- MongoDB connection string
- Twilio credentials (SID, Token, Phone Number)
- Vapi API key and Phone Number ID
- OpenAI API key

## Step 1: Install (2 minutes)

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend (in new terminal)
cd frontend
npm install
cp .env.local.example .env.local
```

## Step 2: Configure (3 minutes)

### Edit `backend/.env`:
```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_random_secret_min_32_chars
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+32XXXXXXXXX
VAPI_API_KEY=your_vapi_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_id
OPENAI_API_KEY=your_openai_key
FRONTEND_URL=http://localhost:3000
```

### Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Step 3: Run (1 minute)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Step 4: Setup Webhooks (2 minutes)

```bash
# Terminal 3 - ngrok
ngrok http 5000
```

Copy the HTTPS URL and configure in:
- **Twilio Console** → Phone Numbers → Your Number → Voice Webhook: `https://your-ngrok-url/api/webhooks/twilio/status`
- **Vapi Dashboard** → Webhooks: `https://your-ngrok-url/api/webhooks/vapi`

## Step 5: First Use (2 minutes)

1. Open `http://localhost:3000`
2. Click "Sign up" and create account
3. Create a Script:
   - Name: "Test Script"
   - Content: "Hello! This is a test call. Press 1 for sales, press 2 for support."
4. Create a Voice:
   - Provider: OpenAI
   - Voice ID: alloy
   - Set as default: ✓
5. Create Agents:
   - Agent 1: Key Press 1, Phone: +32XXXXXXXXX
   - Agent 2: Key Press 2, Phone: +32XXXXXXXXX
6. Make a test call:
   - Go to Calls → Single Call
   - Enter your phone number
   - Select script and voice
   - Click "Initiate Call"

## 🎉 Done!

Your system is ready! You should receive a call from the AI.

## Common Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Start ngrok
ngrok http 5000

# View logs
# Backend logs appear in terminal 1
# Frontend logs appear in terminal 2
```

## Quick Troubleshooting

**Backend won't start?**
- Check MongoDB connection string
- Ensure all env variables are set

**Frontend won't start?**
- Run `rm -rf node_modules && npm install`
- Check port 3000 is available

**Calls not working?**
- Verify Twilio credentials
- Check ngrok is running
- Ensure webhooks are configured

**No voice in calls?**
- Verify OpenAI API key
- Check Vapi configuration

## Next Steps

- Read `README.md` for full documentation
- Check `FEATURES.md` for all features
- Review `SETUP_GUIDE.md` for detailed setup
- Use `CONFIGURATION_CHECKLIST.md` to verify setup

## Support

For issues, check:
1. Backend terminal for errors
2. Frontend terminal for errors
3. Browser console (F12) for errors
4. MongoDB connection
5. API keys validity

## File Structure

```
IVR_System/
├── backend/              # Express.js API
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # External services
│   └── .env            # Backend config
├── frontend/            # Next.js app
│   ├── src/
│   │   ├── app/        # Pages
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities
│   └── .env.local      # Frontend config
└── README.md           # Main documentation
```

## Important URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/api
- Health Check: http://localhost:5000/health

## CSV Format for Bulk Calls

```csv
phone,name
+32123456789,John Doe
+32987654321,Jane Smith
```

## Default Voice IDs (OpenAI)

- `alloy` - Neutral, balanced
- `echo` - Male, clear
- `fable` - British accent
- `onyx` - Deep male
- `nova` - Female, warm
- `shimmer` - Female, bright

## Environment Variables Quick Reference

### Required
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Auth secret (32+ chars)
- `TWILIO_ACCOUNT_SID` - Twilio SID
- `TWILIO_AUTH_TOKEN` - Twilio token
- `TWILIO_PHONE_NUMBER` - Your Twilio number
- `VAPI_API_KEY` - Vapi key
- `VAPI_PHONE_NUMBER_ID` - Vapi phone ID
- `OPENAI_API_KEY` - OpenAI key

### Optional
- `PORT` - Backend port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL (default: http://localhost:3000)

## Tips

1. **Use ngrok for development** - Makes webhooks work locally
2. **Test with your own number first** - Verify everything works
3. **Start with small bulk campaigns** - Test with 2-3 contacts first
4. **Monitor the logs** - Watch for errors in real-time
5. **Keep API keys secure** - Never commit .env files

## Production Deployment

When ready for production:

1. Deploy backend to Heroku/AWS/Railway
2. Deploy frontend to Vercel/Netlify
3. Update environment variables
4. Configure production webhooks
5. Use production MongoDB cluster
6. Enable HTTPS everywhere

## Resources

- [Twilio Docs](https://www.twilio.com/docs)
- [Vapi Docs](https://docs.vapi.ai)
- [OpenAI Docs](https://platform.openai.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [MongoDB Docs](https://docs.mongodb.com)

---

**Need help?** Check the full documentation in `README.md` and `SETUP_GUIDE.md`

