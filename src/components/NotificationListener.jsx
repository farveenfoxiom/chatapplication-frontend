import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import socket from "../socket/socket";
import { useSelector } from "react-redux";
import { requestNotificationPermission,showMessageNotification } from "../utils/Notification";

function NotificationListener() {
  const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const handleNewMessage = (data) => {
      const newMessage = data?.message;
      if (!newMessage) {
        return;
      }
      const senderId =
        newMessage.sender?._id?.toString() ||
        newMessage.sender?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId || !senderId) {
        return;
      }
      if (senderId === currentUserId) {
        return;
      }
      const isChatOpenWithSender =
        location.pathname === `/chat/${senderId}`;
      if (
        isChatOpenWithSender &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        return;
      }
      const senderName =
        newMessage.sender?.name || "New message";
      showMessageNotification({
        title: senderName,
        body: newMessage.text,
        onClick: () => {
          navigate(`/chat/${senderId}`);
        },
      });
    };
    socket.on("new_message", handleNewMessage);
    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [isAuthenticated, currentUser, location.pathname, navigate]);

  return null;
}

export default NotificationListener;