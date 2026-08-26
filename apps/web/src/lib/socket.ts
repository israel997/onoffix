import { io, type Socket } from 'socket.io-client';
import { getStoredTokens, refreshOnce } from './api';

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

  // Si le token a expiré pendant que la socket restait ouverte sans activité REST pour
  // le rafraîchir, le serveur rejette la reconnexion et appelle client.disconnect() —
  // ce qui arrive côté client comme reason "io server disconnect". Or c'est précisément
  // le seul cas où socket.io-client n'essaie JAMAIS de se reconnecter tout seul : sans ce
  // rattrapage, tout le temps réel (chat compris) restait mort jusqu'à un rechargement
  // complet de la page, qui relance un cycle d'auth frais.
  socket.on('disconnect', (reason) => {
    if (reason !== 'io server disconnect') return;
    const tokens = getStoredTokens();
    if (!tokens) return;
    refreshOnce(tokens.refreshToken)
      .then(() => socket?.connect())
      .catch(() => {
        // Session réellement expirée — le prochain appel REST redirigera vers /login.
      });
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
