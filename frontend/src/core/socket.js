import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL;
let socket = null;

export function connectSocket(token) {
  if (!token) {
    throw new Error("Un jeton d’accès est requis pour connecter Socket.IO.");
  }

  if (!socket) {
    socket = io(apiUrl || window.location.origin, {
      path: "/socket.io",
      auth: { token },
      withCredentials: true,
      autoConnect: false,
    });
  } else {
    socket.auth = { token };

    if (socket.connected) {
      socket.disconnect();
    }
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;

  socket.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
