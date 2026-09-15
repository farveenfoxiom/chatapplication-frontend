import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import socket, {
  connectSocket,
  disconnectSocket,
} from "../socket/socket";

import {
  setUserOnline,
  setUserOffline,
} from "../redux/slices/presenceSlice";

import {
  updateMessage,
} from "../redux/slices/messageSlice";

function SocketListener() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    connectSocket(token);

    const handleNewMessage = ({ message }) => {
        if (!message?._id) return;

        socket.emit("message_delivered", message._id);
    };

    const handleMessageDelivered = ({ messageId }) => {
        dispatch(
            updateMessage({
              messageId,
              updates: {
                isDelivered: true,
              },
            })
        );
    };

    const handleUserOnline = ({ userId }) => {
      dispatch(setUserOnline(userId));
    };

    const handleUserOffline = ({ userId, lastSeen }) => {
      dispatch(
        setUserOffline({
          userId,
          lastSeen,
        })
      );
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("new_message", handleNewMessage);
    socket.on("message_delivered",handleMessageDelivered);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("new_message", handleNewMessage);
      socket.off("message_delivered",handleMessageDelivered);
      disconnectSocket();
    };
  }, [token, dispatch]);

  return null;
}

export default SocketListener;