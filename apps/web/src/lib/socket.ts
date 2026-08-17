import { io, type Socket } from 'socket.io-client';
import { getStoredTokens } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Singleton WebSocket connection. `auth` est une fonction (pas un objet figé) pour
 * que chaque tentative de connexion — y compris une reconnexion après coupure —
 * relise le token d'accès courant au lieu de renvoyer celui capté à la création,
 * qui peut avoir expiré entre-temps (access token valide 15 min).
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_URL, {
    auth: (cb) => cb({ token: getStoredTokens()?.accessToken }),
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
