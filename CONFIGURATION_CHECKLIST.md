# Configuration Checklist

Use this checklist to ensure your AI Voice IVR System is properly configured.

## ✅ Pre-Installation Checklist

### Required Accounts
- [ ] MongoDB Atlas account created (or local MongoDB installed)
- [ ] Twilio account created and verified
- [ ] Vapi account created
- [ ] OpenAI account created with API access
- [ ] Node.js v18+ installed
- [ ] Git installed (optional)

### Required Information Gathered
- [ ] MongoDB connection string
- [ ] Twilio Account SID
- [ ] Twilio Auth Token
- [ ] Twilio Phone Number
- [ ] Vapi API Key
- [ ] Vapi Phone Number ID
- [ ] OpenAI API Key

## ✅ Backend Configuration

### Environment Setup
- [ ] Navigated to `backend` folder
- [ ] Ran `npm install`
- [ ] Copied `.env.example` to `.env`
- [ ] Filled in all environment variables in `.env`:
  - [ ] PORT (default: 5000)
  - [ ] NODE_ENV (development/production)
  - [ ] MONGODB_URI
  - [ ] JWT_SECRET (min 32 characters)
  - [ ] TWILIO_ACCOUNT_SID
  - [ ] TWILIO_AUTH_TOKEN
  - [ ] TWILIO_PHONE_NUMBER
  - [ ] VAPI_API_KEY
  - [ ] VAPI_PHONE_NUMBER_ID
  - [ ] OPENAI_API_KEY
  - [ ] FRONTEND_URL
  - [ ] AGENT_1_PHONE
  - [ ] AGENT_2_PHONE

### Backend Testing
- [ ] Started backend with `npm run dev`
- [ ] Verified "Server running on port 5000" message
- [ ] Verified "MongoDB connected successfully" message
- [ ] Tested health endpoint: `http://localhost:5000/health`

## ✅ Frontend Configuration

### Environment Setup
- [ ] Navigated to `frontend` folder
- [ ] Ran `npm install`
- [ ] Copied `.env.local.example` to `.env.local`
- [ ] Set `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### Frontend Testing
- [ ] Started frontend with `npm run dev`
- [ ] Verified "ready - started server on 0.0.0.0:3000" message
- [ ] Opened `http://localhost:3000` in browser
- [ ] Verified login page loads correctly

## ✅ Webhook Configuration

### Development (ngrok)
- [ ] Installed ngrok: `npm install -g ngrok`
- [ ] Started ngrok: `ngrok http 5000`
- [ ] Copied ngrok HTTPS URL (e.g., https://abc123.ngrok.io)

### Twilio Webhooks
- [ ] Logged into Twilio Console
- [ ] Navigated to Phone Numbers → Active Numbers
- [ ] Clicked on your phone number
- [ ] Under "Voice & Fax":
  - [ ] Set "A CALL COMES IN" to Webhook
  - [ ] Set URL to: `https://your-ngrok-url/api/webhooks/twilio/status`
  - [ ] Set HTTP method to POST
- [ ] Under "Status Callback URL":
  - [ ] Set URL to: `https://your-ngrok-url/api/webhooks/twilio/status`
- [ ] Clicked "Save"

### Vapi Webhooks
- [ ] Logged into Vapi Dashboard
- [ ] Navigated to Settings or Webhooks section
- [ ] Added webhook URL: `https://your-ngrok-url/api/webhooks/vapi`
- [ ] Saved configuration

## ✅ Initial System Setup

### User Account
- [ ] Opened `http://localhost:3000`
- [ ] Clicked "Sign up"
- [ ] Created account with:
  - [ ] Name
  - [ ] Email
  - [ ] Password (min 6 characters)
  - [ ] Company (optional)
- [ ] Successfully logged in

### First Script
- [ ] Navigated to Scripts section
- [ ] Clicked "New Script"
- [ ] Created script with:
  - [ ] Name
  - [ ] Description
  - [ ] Category
  - [ ] System Prompt
  - [ ] Script Content
- [ ] Saved script successfully

### First Voice
- [ ] Navigated to Voices section
- [ ] Clicked "New Voice"
- [ ] Created voice with:
  - [ ] Name
  - [ ] Provider (OpenAI recommended)
  - [ ] Voice ID (e.g., "alloy")
  - [ ] Gender
  - [ ] Set as default (checked)
- [ ] Saved voice successfully

### Agents Setup
- [ ] Navigated to Agents section
- [ ] Created Agent 1:
  - [ ] Name
  - [ ] Phone Number
  - [ ] Key Press: 1
  - [ ] Department
  - [ ] Available: checked
- [ ] Created Agent 2:
  - [ ] Name
  - [ ] Phone Number
  - [ ] Key Press: 2
  - [ ] Department
  - [ ] Available: checked

## ✅ Testing

### Single Call Test
- [ ] Navigated to Calls section
- [ ] Selected "Single Call" tab
- [ ] Filled in:
  - [ ] Customer Phone (your test number)
  - [ ] Customer Name
  - [ ] Selected Script
  - [ ] Selected Voice
- [ ] Clicked "Initiate Call"
- [ ] Received call on test phone
- [ ] AI voice spoke correctly
- [ ] Tested pressing 1 or 2
- [ ] Successfully transferred to agent
- [ ] Call appeared in Call History

### Bulk Call Test
- [ ] Created CSV file with test contacts
- [ ] Navigated to Calls → Bulk Call
- [ ] Filled in:
  - [ ] Campaign Name
  - [ ] Selected Script
  - [ ] Selected Voice
  - [ ] Uploaded CSV file
- [ ] Clicked "Start Bulk Campaign"
- [ ] Campaign created successfully
- [ ] Calls initiated with delays
- [ ] Campaign appeared in campaigns list

### Dashboard Test
- [ ] Navigated to Dashboard
- [ ] Verified statistics display correctly
- [ ] Checked Total Calls count
- [ ] Checked Completed Calls count
- [ ] Verified call duration statistics

### Analytics Test
- [ ] Navigated to Analytics
- [ ] Verified all metrics display
- [ ] Checked success rate calculation
- [ ] Verified call status breakdown

## ✅ Production Deployment (Optional)

### Backend Deployment
- [ ] Chose hosting platform (Heroku/AWS/DigitalOcean/Railway)
- [ ] Deployed backend code
- [ ] Set environment variables on hosting platform
- [ ] Updated MongoDB to production cluster
- [ ] Verified backend is accessible via HTTPS
- [ ] Tested API endpoints

### Frontend Deployment
- [ ] Chose hosting platform (Vercel/Netlify/AWS)
- [ ] Updated `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Deployed frontend code
- [ ] Verified frontend is accessible
- [ ] Tested all pages and functionality

### Production Webhooks
- [ ] Updated Twilio webhooks to production URLs
- [ ] Updated Vapi webhooks to production URLs
- [ ] Tested webhooks with production calls

### Security
- [ ] Changed JWT_SECRET to strong random string
- [ ] Enabled HTTPS on all endpoints
- [ ] Configured proper CORS settings
- [ ] Reviewed and secured all API keys
- [ ] Set up monitoring and logging

## ✅ Troubleshooting Completed

### Common Issues Checked
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] MongoDB connection successful
- [ ] API calls work from frontend to backend
- [ ] Webhooks receive data correctly
- [ ] Calls are initiated successfully
- [ ] Voice works in calls
- [ ] Transfers work correctly
- [ ] CSV upload works
- [ ] All pages load correctly

## 📝 Notes

### Important URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Backend Health: `http://localhost:5000/health`
- Ngrok URL: `_______________________`

### Important Credentials (Keep Secure!)
- MongoDB URI: `_______________________`
- JWT Secret: `_______________________`
- Twilio SID: `_______________________`
- Vapi API Key: `_______________________`
- OpenAI API Key: `_______________________`

### Test Phone Numbers
- Test Number 1: `_______________________`
- Test Number 2: `_______________________`
- Agent 1 Phone: `_______________________`
- Agent 2 Phone: `_______________________`

## ✅ Final Verification

- [ ] All features working as expected
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Calls complete successfully
- [ ] Transfers work correctly
- [ ] Data persists in database
- [ ] Analytics show correct data
- [ ] CSV upload processes correctly
- [ ] All CRUD operations work
- [ ] Authentication works properly

## 🎉 System Ready!

Once all items are checked, your AI Voice IVR System is fully configured and ready to use!

### Next Steps
1. Create your production scripts
2. Configure your production voices
3. Set up your real agents
4. Import your contact lists
5. Start your campaigns!

### Support
If you encounter any issues, refer to:
- `README.md` - General documentation
- `SETUP_GUIDE.md` - Detailed setup instructions
- `FEATURES.md` - Feature documentation
- Backend logs for errors
- Frontend console for errors

