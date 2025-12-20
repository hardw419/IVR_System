# AI Voice IVR System

A comprehensive AI-powered outbound IVR (Interactive Voice Response) system built for Belgium market. This system enables automated calling with AI voice capabilities, script management, and intelligent call routing.

## 🌟 Features

### Core Features
- **AI Voice Calling**: Powered by Vapi and OpenAI for natural conversations
- **Script Management**: Create, edit, and manage multiple call scripts
- **Voice Configuration**: Support for multiple voice providers (OpenAI, ElevenLabs, Azure, Google)
- **Single & Bulk Calling**: Make individual calls or bulk campaigns via CSV upload
- **Call Routing**: Customers can press 1 or 2 to be transferred to specific agents
- **Agent Management**: Configure agents for call transfers
- **Real-time Analytics**: Track call performance and statistics
- **User Authentication**: Secure login and registration system

### Technical Features
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Express.js with MongoDB
- **Integrations**: Twilio, Vapi, OpenAI
- **Real-time Updates**: Webhook support for call status updates
- **CSV Import**: Bulk contact upload for campaigns

## 📋 Prerequisites

Before you begin, ensure you have the following:

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Twilio Account with:
  - Account SID
  - Auth Token
  - Phone Number
- Vapi Account with:
  - API Key
  - Phone Number ID
- OpenAI API Key

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IVR_System
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env` and add your credentials:

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Vapi Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Agent Phone Numbers
AGENT_1_PHONE=+32_agent_1_phone_number
AGENT_2_PHONE=+32_agent_2_phone_number
```

### 3. Frontend Setup

```bash
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

## 🏃 Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

### Start Frontend Application

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📱 Usage Guide

### 1. Register/Login
- Navigate to `http://localhost:3000`
- Create a new account or login with existing credentials

### 2. Create Scripts
- Go to **Scripts** section
- Click **New Script**
- Enter script name, content, and system prompt
- Save the script

### 3. Configure Voices
- Go to **Voices** section
- Click **New Voice**
- Select provider (OpenAI recommended for Belgium)
- Enter voice ID (e.g., "alloy", "echo", "fable", "onyx", "nova", "shimmer")
- Save the voice configuration

### 4. Setup Agents
- Go to **Agents** section
- Click **New Agent**
- Enter agent name and phone number
- Assign key press (1 or 2)
- Save the agent

### 5. Make Calls

#### Single Call
- Go to **Calls** section
- Select **Single Call** tab
- Enter customer phone number (Belgium format: +32 XXX XX XX XX)
- Select script and voice
- Click **Initiate Call**

#### Bulk Call
- Prepare a CSV file with columns: `phone`, `name` (optional)
- Go to **Calls** section
- Select **Bulk Call** tab
- Enter campaign name
- Select script and voice
- Upload CSV file
- Click **Start Bulk Campaign**

### 6. View Analytics
- Go to **Analytics** section
- View call statistics, success rates, and performance metrics

## 📊 CSV Format for Bulk Calls

Create a CSV file with the following format:

```csv
phone,name
+32123456789,John Doe
+32987654321,Jane Smith
+32555555555,Bob Johnson
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Scripts
- `GET /api/scripts` - Get all scripts
- `POST /api/scripts` - Create script
- `PUT /api/scripts/:id` - Update script
- `DELETE /api/scripts/:id` - Delete script

### Voices
- `GET /api/voices` - Get all voices
- `POST /api/voices` - Create voice
- `PUT /api/voices/:id` - Update voice
- `DELETE /api/voices/:id` - Delete voice

### Calls
- `GET /api/calls` - Get all calls
- `POST /api/calls/single` - Initiate single call
- `POST /api/calls/bulk` - Initiate bulk campaign
- `GET /api/calls/stats/overview` - Get call statistics

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

## 🌐 Webhooks

The system uses webhooks for real-time call updates:

- `/api/webhooks/twilio/status` - Twilio call status updates
- `/api/webhooks/twilio/recording` - Twilio recording callbacks
- `/api/webhooks/twilio/gather` - Handle customer key presses
- `/api/webhooks/vapi` - Vapi call events

**Important**: Configure these webhook URLs in your Twilio and Vapi dashboards.

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Backend**: Express.js, Node.js
- **Database**: MongoDB with Mongoose
- **AI/Voice**: Vapi, OpenAI
- **Telephony**: Twilio
- **Authentication**: JWT

## 📝 License

This project is proprietary software.

## 🤝 Support

For support, please contact the development team.

