import { createContext, useContext, useEffect, useState } from "react";
import socket, { connectSocket, disconnectSocket } from "../socket/socket";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const login = (loginData) => {
    setUser(loginData.user);
    setToken(loginData.token);
    localStorage.setItem("token", loginData.token);
    localStorage.setItem("user", JSON.stringify(loginData.user));
  };
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    socket.auth = { token };
    if (!socket.connected) {
      connectSocket(token);
    }
    const handleConnect = () => {
    };
    const handleConnectError = (error) => {
      console.error("SOCKET CONNECTION ERROR:", error.message);
    };
    const handleDisconnect = (reason) => {
      if (reason === "io server disconnect") {
        socket.connect();
      }
    };
    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
    };
  }, [token]);
  const logout = () => {
    disconnectSocket();
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
export default AuthContext;