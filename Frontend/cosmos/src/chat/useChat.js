import { useState, useCallback } from 'react';

export function useChat() {
  const [conversations, setConversations] = useState({});

  const receiveMessage = useCallback((msg) => {
    setConversations(prev => ({
      ...prev,
      [msg.fromSocketId]: [
        ...(prev[msg.fromSocketId] || []),
        { ...msg, direction: 'incoming' },
      ],
    }));
  }, []);

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

  const getMessages = (socketId) => conversations[socketId] || [];

  return { receiveMessage, sendMessage, getMessages };
}