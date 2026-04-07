require('dotenv').config();

const express = require('express');
const http = require('http');           
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());


app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.json({ status: 'server running ' }));


const httpServer = http.createServer(app);


const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ── 5. IN-MEMORY STATE ────────────────────────────────────────────
const connectedUsers = new Map();

// ── 6. SOCKET.IO EVENT HANDLERS ───────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  socket.on('user:join', (userData) => {
    // Store this user in our map
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: userData.userId,
      username: userData.username,
      color: userData.color,
      x: 400,   
      y: 300,
    });

    socket.broadcast.emit('user:joined', {
      socketId: socket.id,
      ...connectedUsers.get(socket.id),
    });

    const others = [];
    connectedUsers.forEach((user, sid) => {
      if (sid !== socket.id) others.push(user);
    });
    socket.emit('users:current', others);

    console.log(`[Join] ${userData.username} joined. Total: ${connectedUsers.size}`);
  });

  socket.on('user:move', ({ x, y }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Update in memory
    user.x = x;
    user.y = y;

   
    socket.broadcast.emit('user:moved', {
      socketId: socket.id,
      x,
      y,
    });
  });

  io.on('connection', (socket) => {

  socket.on('user:join', (user) => {
    connectedUsers.set(socket.id, user);
  });

  socket.on('chat:message', ({ toSocketId, message }) => {
    const sender = connectedUsers.get(socket.id);
    const receiver = connectedUsers.get(toSocketId);

    if (!sender || !receiver || !message?.trim()) return;

    io.to(toSocketId).emit('chat:received', {
      fromSocketId: socket.id,
      fromUsername: sender.username,
      fromColor: sender.color,
      message: message.trim(),
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
  });

});
});

// ── 7. CONNECT TO MONGODB THEN START SERVER ───────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Connection failed:', err);
    process.exit(1);
  });