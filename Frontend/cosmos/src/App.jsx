import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import CosmosCanvas from './cosmos/CosmosCanvas';
import ChatPanel from './chat/ChatPanel';
import { useChat } from './chat/useChat';

// Connect to our backend. In dev, Vite proxies /api so just use localhost.
const socket = io('http://localhost:5000', { autoConnect: false });

export default function App() {
  const [user, setUser] = useState(null);         // the logged-in user (from DB)
  const [username, setUsername] = useState('');   // input field value
  const [others, setOthers] = useState([]);       // all other connected users
  const [nearby, setNearby] = useState([]);       // users in proximity range
  const [activeChat, setActiveChat] = useState(null); // user we're chatting with
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { receiveMessage, sendMessage, getMessages } = useChat();

  // ── JOIN THE COSMOS ────────────────────────────────────────────
  async function handleJoin() {
    if (!username.trim()) return;

    // 1. Register/login via REST API (persists to MongoDB)
    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const { user: dbUser } = await res.json();
    setUser(dbUser);

    // 2. Connect socket and announce presence
    socket.connect();
    socket.emit('user:join', {
      userId: dbUser._id,
      username: dbUser.username,
      color: dbUser.color,
    });
  }

  // ── SOCKET EVENT LISTENERS ─────────────────────────────────────
  useEffect(() => {
    // Someone else joined
    socket.on('user:joined', (newUser) => {
      setOthers(prev => [...prev, newUser]);
    });

    // Existing users when we first join
    socket.on('users:current', (existingUsers) => {
      setOthers(existingUsers);
    });

    // Someone moved
    socket.on('user:moved', ({ socketId, x, y }) => {
      setOthers(prev =>
        prev.map(u => u.socketId === socketId ? { ...u, x, y } : u)
      );
    });

    // Someone left
    socket.on('user:left', ({ socketId }) => {
      setOthers(prev => prev.filter(u => u.socketId !== socketId));
      // If we were chatting with them, close chat
      if (activeChat?.socketId === socketId) {
        setActiveChat(null);
        setSidebarOpen(false);
      }
    });

    // We received a chat message
    socket.on('chat:received', (msg) => {
      receiveMessage(msg);
      // Auto-open chat panel if not already open
      setSidebarOpen(true);
      setActiveChat(prev => prev || { socketId: msg.fromSocketId, username: msg.fromUsername, color: msg.fromColor });
    });

    // Cleanup all listeners on unmount
    return () => {
      socket.off('user:joined');
      socket.off('users:current');
      socket.off('user:moved');
      socket.off('user:left');
      socket.off('chat:received');
    };
  }, [activeChat]);

  // ── SEND POSITION UPDATE ───────────────────────────────────────
  const handleMove = useCallback((x, y) => {
    socket.emit('user:move', { x, y });
  }, []);

  // ── PROXIMITY CHANGE ──────────────────────────────────────────
  const handleProximity = useCallback((nearbyUsers) => {
    setNearby(nearbyUsers);
    // Auto open chat when someone enters range
    if (nearbyUsers.length > 0 && !sidebarOpen) {
      setSidebarOpen(true);
      setActiveChat(nearbyUsers[0]);
    }
    // Auto close when everyone leaves
    if (nearbyUsers.length === 0) {
      setSidebarOpen(false);
      setActiveChat(null);
    }
  }, [sidebarOpen]);

  // ── SEND CHAT MESSAGE ─────────────────────────────────────────
  function handleSendMessage(toSocketId, message) {
    socket.emit('chat:message', { toSocketId, message });
    sendMessage(toSocketId, message);
  }

  // ── LOGIN SCREEN ──────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="bg-[#13131a] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-1">Virtual Cosmos</h1>
          <p className="text-sm text-gray-400 mb-6">Enter a username to join the space</p>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
              text-white text-sm outline-none focus:border-purple-500 transition-colors mb-3"
            placeholder="Your username..."
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            onClick={handleJoin}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3
              text-sm font-medium transition-colors"
          >
            Enter Cosmos →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────
  const meWithSocket = { ...user, socketId: socket.id, x: 400, y: 300 };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f]">
      {/* Top bar */}
      <div className="flex items-center px-5 h-13 bg-[#13131a] border-b border-white/10 gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          Virtual Cosmos
        </div>
        <div className="w-px h-5 bg-white/10" />
        <span className="text-xs text-gray-400">{others.length + 1} users online</span>
        {nearby.length > 0 && (
          <span className="text-xs text-emerald-400 ml-auto">
            ● {nearby.length} user{nearby.length > 1 ? 's' : ''} nearby
          </span>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <CosmosCanvas
            me={meWithSocket}
            others={others}
            onMove={handleMove}
            onProximity={handleProximity}
          />
          {/* Controls hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#13131a]
            border border-white/10 rounded-full px-4 py-2 text-xs text-gray-400
            flex gap-3 pointer-events-none">
            <span>Move: <kbd className="bg-white/10 rounded px-1">WASD</kbd> or arrows</span>
            <span className="text-white/20">|</span>
            <span>Get close to chat</span>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className={`transition-all duration-300 bg-[#13131a] border-l border-white/10
          flex flex-col overflow-hidden ${sidebarOpen ? 'w-72' : 'w-0'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-medium">Nearby Chat</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white text-lg"
            >×</button>
          </div>
          <ChatPanel
            nearbyUsers={nearby}
            activeChat={activeChat}
            onSelectChat={setActiveChat}
            messages={activeChat ? getMessages(activeChat.socketId) : []}
            onSend={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}