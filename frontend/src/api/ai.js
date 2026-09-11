import client from './client'

export const aiChat = (message, conversationHistory) =>
  client.post('/ai/chat', { message, conversation_history: conversationHistory })

export const aiConfirm = (tool, args, confirmed) =>
  client.post('/ai/confirm', { tool, args, confirmed })
