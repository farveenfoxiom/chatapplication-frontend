import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://chatapplication-backend-qrxy.onrender.com/api";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = (token) => {
  if (!token) {
    return;
  }
  socket.auth = {token,};
  if (!socket.connected) {
    socket.connect();
  }
};
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;