require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or is a Vercel preview URL
    if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Maintenance mode middleware
// ONLY blocks traffic when MAINTENANCE_MODE=true is set in environment.
// maintenance.json alone no longer blocks production (prevents stuck deploys).
app.use((req, res, next) => {
  // Always allow health check
  if (req.path === '/health') {
    return next();
  }

  const envEnabled = String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';
  if (!envEnabled) {
    return next();
  }

  let message = 'System is under maintenance';
  try {
    const maintenanceConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'config', 'maintenance.json'), 'utf8')
    );
    if (maintenanceConfig.message) {
      message = maintenanceConfig.message;
    }
  } catch (err) {
    // use default message
  }

  return res.status(503).json({
    success: false,
    maintenance: true,
    message
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Agent connected:', socket.id);

  // Agent joins their user room for targeted updates
  socket.on('join-agent-room', (userId) => {
    socket.join(`agent-${userId}`);
    console.log(`👤 Agent ${socket.id} joined room agent-${userId}`);
  });

  // Agent goes online/offline
  socket.on('agent-status', (data) => {
    io.to(`agent-${data.userId}`).emit('agent-status-update', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Agent disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/voices', require('./routes/voices'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/queue', require('./routes/queue'));

// Health check
app.get('/health', (req, res) => {
  const maintenanceEnabled = String(process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';

  res.json({
    status: 'OK',
    message: 'Server is running',
    maintenance: maintenanceEnabled,
    deployedAt: '2026-08-01-maintenance-off-v2'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

