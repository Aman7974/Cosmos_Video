require('dotenv').config();

const express = require('express');
const http = require('http');           // Node's built-in HTTP module
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');

// ── 1. CREATE EXPRESS APP ──────────────────────────────────────────
const app = express();

// Middleware: parse JSON bodies and allow cross-origin requests
app.use(cors({ origin: 'http://localhost:5173' })); // Vite's default port
app.use(express.json());

// ── 2. ATTACH ROUTES ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check — visit http://localhost:5000 to confirm server is running
app.get('/', (req, res) => res.json({ status: 'Virtual Cosmos server running 🚀' }));

// ── 3. WRAP EXPRESS IN HTTP SERVER ────────────────────────────────
// Socket.IO needs the raw http.Server (not just express)
const httpServer = http.createServer(app);

// ── 4. ATTACH SOCKET.IO TO THE HTTP SERVER ────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ── 5. IN-MEMORY STATE ────────────────────────────────────────────
// We track all connected users in memory.
// Key = socket.id, Value = { userId, username, color, x, y }
// Why not MongoDB? Position changes 60x/sec — too fast for DB writes.
// MongoDB stores persistent data; memory stores live session data.
const connectedUsers = new Map();

// ── 6. SOCKET.IO EVENT HANDLERS ───────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // EVENT: client joins the cosmos
  // Data: { userId, username, color }
  socket.on('user:join', (userData) => {
    // Store this user in our map
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: userData.userId,
      username: userData.username,
      color: userData.color,
      x: 400,   // spawn position
      y: 300,
    });

    // Tell everyone else a new user arrived
    // socket.broadcast = send to ALL sockets EXCEPT the sender
    socket.broadcast.emit('user:joined', {
      socketId: socket.id,
      ...connectedUsers.get(socket.id),
    });

    // Send the new user the list of ALL currently connected users
    // (so they can see everyone who's already there)
    const others = [];
    connectedUsers.forEach((user, sid) => {
      if (sid !== socket.id) others.push(user);
    });
    socket.emit('users:current', others);

    console.log(`[Join] ${userData.username} joined. Total: ${connectedUsers.size}`);
  });

  // EVENT: user moved — update their position and broadcast
  // Data: { x, y }
  // This fires very frequently (every animation frame), so keep it FAST
  socket.on('user:move', ({ x, y }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Update in memory
    user.x = x;
    user.y = y;

    // Broadcast to everyone else
    // We only send what's needed (socketId + position) to minimize data
    socket.broadcast.emit('user:moved', {
      socketId: socket.id,
      x,
      y,
    });
  });

  // EVENT: chat message sent
  // Data: { toSocketId, message }
  socket.on('chat:message', ({ toSocketId, message }) => {
    const sender = connectedUsers.get(socket.id);
    if (!sender || !message.trim()) return;

    // Only send to the intended recipient, not everyone
    io.to(toSocketId).emit('chat:received', {
      fromSocketId: socket.id,
      fromUsername: sender.username,
      fromColor: sender.color,
      message: message.trim(),
      timestamp: Date.now(),
    });
  });

  // EVENT: user disconnected (browser closed, navigated away, etc.)
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`[Disconnect] ${user.username} left`);
      connectedUsers.delete(socket.id);
      // Tell everyone this user is gone
      socket.broadcast.emit('user:left', { socketId: socket.id });
    }
  });
});

// ── 7. CONNECT TO MONGODB THEN START SERVER ───────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    httpServer.listen(process.env.PORT, () => {
      console.log(`[Server] Running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1); // crash intentionally so you know something is wrong
  });