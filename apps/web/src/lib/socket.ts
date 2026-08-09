import { io, type Socket } from 'socket.io-client';
import { getStoredTokens } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/** Singleton WebSocket connection, authenticated with the current access token. */
export function getSocket(): Socket {
  if (socket) return socket;
  const tokens = getStoredTokens();
  socket = io(API_URL, { auth: { token: tokens?.accessToken } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
