import { useState, useCallback } from 'react';

export function useChat() {
  // { [socketId]: [ { from, username, color, message, timestamp } ] }
  const [conversations, setConversations] = useState({});

  // Call this when socket receives a message
  const receiveMessage = useCallback((msg) => {
    setConversations(prev => ({
      ...prev,
      [msg.fromSocketId]: [
        ...(prev[msg.fromSocketId] || []),
        { ...msg, direction: 'incoming' },
      ],
    }));
  }, []);

  // Call this when WE send a message
  const sendMessage = useCallback((toSocketId, message) => {
    setConversations(prev => ({
      ...prev,
      [toSocketId]: [
        ...(prev[toSocketId] || []),
        {
          fromSocketId: 'me',
          message,
          direction: 'outgoing',
          timestamp: Date.now(),
        },
      ],
    }));
  }, []);

  // Get messages for a specific user
  const getMessages = (socketId) => conversations[socketId] || [];

  return { receiveMessage, sendMessage, getMessages };
}