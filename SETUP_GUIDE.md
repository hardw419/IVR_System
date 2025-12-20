# Complete Setup Guide - AI Voice IVR System

This guide will walk you through setting up the AI Voice IVR System from scratch.

## Step 1: Get Required API Keys

### 1.1 MongoDB Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Click "Connect" and get your connection string
5. Replace `<password>` with your database password
6. Save this connection string for later

### 1.2 Twilio Setup
1. Go to [Twilio](https://www.twilio.com/)
2. Sign up for an account
3. From the Console Dashboard, note down:
   - **Account SID**
   - **Auth Token**
4. Go to Phone Numbers → Buy a Number
5. Purchase a phone number (Belgium: +32)
6. Note down your **Phone Number**

### 1.3 Vapi Setup
1. Go to [Vapi.ai](https://vapi.ai/)
2. Sign up for an account
3. Go to Dashboard → API Keys
4. Create a new API key and save it
5. Go to Phone Numbers
6. Add a phone number or use Vapi's number
7. Note down the **Phone Number ID**

### 1.4 OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or login
3. Go to API Keys section
4. Create a new API key
5. Save this key securely

## Step 2: Install Dependencies

### 2.1 Install Node.js
- Download and install Node.js v18+ from [nodejs.org](https://nodejs.org/)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2.2 Install MongoDB (Optional - if using local)
- Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- Or use MongoDB Atlas (cloud) - recommended

## Step 3: Project Setup

### 3.1 Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
PORT=5000
NODE_ENV=development

# MongoDB - paste your connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ivr_system

# JWT Secret - generate random string
JWT_SECRET=your_random_secret_key_min_32_characters

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+32XXXXXXXXX

# Vapi
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Agent Phone Numbers (update with real numbers)
AGENT_1_PHONE=+32123456789
AGENT_2_PHONE=+32987654321
```

### 3.2 Frontend Setup

```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Step 4: Configure Webhooks

### 4.1 Expose Local Server (Development)

For development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 5000
ngrok http 5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 4.2 Configure Twilio Webhooks

1. Go to Twilio Console → Phone Numbers
2. Click on your phone number
3. Under "Voice & Fax", set:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/twilio/status`
   - **HTTP**: POST
4. Under "Status Callback URL":
   - **URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/twilio/status`
5. Save

### 4.3 Configure Vapi Webhooks

1. Go to Vapi Dashboard → Settings
2. Add webhook URL: `https://your-ngrok-url.ngrok.io/api/webhooks/vapi`
3. Save

## Step 5: Run the Application

### 5.1 Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected successfully
```

### 5.2 Start Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000
```

## Step 6: First Time Setup

### 6.1 Create Account
1. Open browser: `http://localhost:3000`
2. Click "Sign up"
3. Fill in your details
4. Click "Sign up"

### 6.2 Create Your First Script
1. Go to **Scripts** section
2. Click **New Script**
3. Example script:
   - **Name**: Sales Call - Belgium
   - **Category**: Sales
   - **System Prompt**: "You are a professional sales representative calling on behalf of a company in Belgium. Speak in Dutch or French based on customer preference."
   - **Content**: "Hello! This is [Your Company]. We're calling to inform you about our special offer. Are you interested in learning more? Press 1 to speak with a sales agent, or press 2 for customer support."
4. Click **Create**

### 6.3 Configure Voice
1. Go to **Voices** section
2. Click **New Voice**
3. Fill in:
   - **Name**: Professional Dutch Voice
   - **Provider**: OpenAI
   - **Voice ID**: alloy (or echo, fable, onyx, nova, shimmer)
   - **Gender**: Select appropriate
   - **Set as default**: Check this
4. Click **Create**

### 6.4 Setup Agents
1. Go to **Agents** section
2. Click **New Agent**
3. For Agent 1:
   - **Name**: Sales Team
   - **Phone Number**: +32XXXXXXXXX (your sales team number)
   - **Key Press**: 1
   - **Department**: Sales
   - **Available**: Checked
4. Click **Create**
5. Repeat for Agent 2 (Support Team)

### 6.5 Make Test Call
1. Go to **Calls** section
2. Select **Single Call** tab
3. Fill in:
   - **Customer Phone**: Your test number (+32XXXXXXXXX)
   - **Customer Name**: Test User
   - **Script**: Select your created script
   - **Voice**: Select your created voice
4. Click **Initiate Call**
5. Answer the call and test the system!

## Step 7: Bulk Calling

### 7.1 Prepare CSV File

Create a file `contacts.csv`:

```csv
phone,name
+32123456789,John Doe
+32987654321,Jane Smith
+32555555555,Bob Johnson
```

### 7.2 Upload and Run Campaign

1. Go to **Calls** → **Bulk Call** tab
2. Enter campaign name
3. Select script and voice
4. Upload your CSV file
5. Click **Start Bulk Campaign**

## Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Ensure all environment variables are set
- Check if port 5000 is available

### Frontend won't start
- Clear node_modules: `rm -rf node_modules && npm install`
- Check if port 3000 is available

### Calls not working
- Verify Twilio credentials
- Check Vapi API key
- Ensure webhooks are configured correctly
- Check ngrok is running (for development)

### No voice in calls
- Verify OpenAI API key
- Check voice ID is correct
- Ensure Vapi configuration is correct

## Production Deployment

For production deployment:

1. **Backend**: Deploy to services like:
   - Heroku
   - AWS EC2
   - DigitalOcean
   - Railway

2. **Frontend**: Deploy to:
   - Vercel (recommended for Next.js)
   - Netlify
   - AWS Amplify

3. **Update Environment Variables**:
   - Use production MongoDB cluster
   - Update FRONTEND_URL and BACKEND_URL
   - Configure production webhook URLs in Twilio/Vapi

4. **Security**:
   - Use strong JWT_SECRET
   - Enable HTTPS
   - Set up proper CORS
   - Use environment-specific configs

## Support

If you encounter issues:
1. Check the console logs (backend and frontend)
2. Verify all API keys are correct
3. Ensure webhooks are properly configured
4. Check network connectivity

For additional help, contact the development team.

