# Backend - AI Voice IVR System

Express.js backend for the AI Voice IVR System.

## Features

- RESTful API architecture
- MongoDB database with Mongoose ODM
- JWT authentication
- Twilio integration for telephony
- Vapi integration for AI voice
- OpenAI integration for LLM
- Webhook handlers for real-time updates
- CSV parsing for bulk operations

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

## Running

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Scripts
- `GET /api/scripts` - Get all scripts (requires auth)
- `GET /api/scripts/:id` - Get single script (requires auth)
- `POST /api/scripts` - Create script (requires auth)
- `PUT /api/scripts/:id` - Update script (requires auth)
- `DELETE /api/scripts/:id` - Delete script (requires auth)

### Voices
- `GET /api/voices` - Get all voices (requires auth)
- `GET /api/voices/:id` - Get single voice (requires auth)
- `POST /api/voices` - Create voice (requires auth)
- `PUT /api/voices/:id` - Update voice (requires auth)
- `DELETE /api/voices/:id` - Delete voice (requires auth)

### Calls
- `GET /api/calls` - Get all calls (requires auth)
- `GET /api/calls/:id` - Get single call (requires auth)
- `POST /api/calls/single` - Initiate single call (requires auth)
- `POST /api/calls/bulk` - Initiate bulk campaign (requires auth)
- `GET /api/calls/campaigns/list` - Get all campaigns (requires auth)
- `GET /api/calls/stats/overview` - Get call statistics (requires auth)

### Agents
- `GET /api/agents` - Get all agents (requires auth)
- `POST /api/agents` - Create agent (requires auth)
- `PUT /api/agents/:id` - Update agent (requires auth)
- `DELETE /api/agents/:id` - Delete agent (requires auth)

### Webhooks (Public)
- `POST /api/webhooks/twilio/status` - Twilio call status updates
- `POST /api/webhooks/twilio/recording` - Twilio recording callbacks
- `POST /api/webhooks/twilio/gather` - Handle customer key presses
- `POST /api/webhooks/vapi` - Vapi call events

## Project Structure

```
backend/
├── models/           # MongoDB models
│   ├── User.js
│   ├── Script.js
│   ├── Voice.js
│   ├── Call.js
│   ├── Agent.js
│   └── Campaign.js
├── routes/           # API routes
│   ├── auth.js
│   ├── scripts.js
│   ├── voices.js
│   ├── calls.js
│   ├── agents.js
│   └── webhooks.js
├── services/         # External service integrations
│   ├── vapiService.js
│   └── twilioService.js
├── middleware/       # Express middleware
│   └── auth.js
├── server.js         # Main server file
└── package.json
```

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **twilio** - Twilio SDK
- **axios** - HTTP client for Vapi
- **dotenv** - Environment variables
- **cors** - CORS middleware
- **multer** - File upload handling
- **csv-parser** - CSV parsing

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- CORS enabled for frontend
- Input validation using express-validator
- Environment variables for sensitive data

