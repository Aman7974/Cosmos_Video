import { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ nearbyUsers, activeChat, onSelectChat, messages, onSend }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || !activeChat) return;
    onSend(activeChat.socketId, input.trim());
    setInput('');
  }

  // If nobody nearby, show empty state
  if (nearbyUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-4xl mb-3">👋</div>
        <p className="text-sm text-gray-400">Move close to another user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Nearby users tabs */}
      <div className="flex gap-2 p-3 border-b border-white/10 overflow-x-auto">
        {nearbyUsers.map(user => (
          <button
            key={user.socketId}
            onClick={() => onSelectChat(user)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
              transition-all whitespace-nowrap border
              ${activeChat?.socketId === user.socketId
                ? 'border-purple-500 bg-purple-500/20 text-white'
                : 'border-white/10 text-gray-400 hover:border-white/30'
              }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: user.color }}
            />
            {user.username}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {!activeChat ? (
          <p className="text-xs text-gray-500 text-center mt-4">Select a user above to chat</p>
        ) : messages.length === 0 ? (
          <div className="text-xs text-gray-500 text-center mt-4 bg-white/5 rounded-lg p-3">
            You are now connected to {activeChat.username}. Say hi!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-0.5 max-w-[85%] ${
                msg.direction === 'outgoing' ? 'self-end items-end' : 'self-start'
              }`}
            >
              <span className="text-[10px] text-gray-500 px-1">
                {msg.direction === 'outgoing' ? 'You' : msg.fromUsername}
              </span>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                  msg.direction === 'outgoing'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-100 rounded-bl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {activeChat && (
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2
              text-sm text-white placeholder-gray-500 outline-none
              focus:border-purple-500 transition-colors"
            placeholder={`Message ${activeChat.username}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center
              hover:bg-purple-500 transition-colors text-white text-sm"
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}