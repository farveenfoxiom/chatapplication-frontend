import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import SearchBar from "./SearchBar";
import ChatItem from "./ChatItem";
import { getRecentChats, deleteChat, getChatPreview } from "../services/chatService";
import { getUserById } from "../services/userService";
import {
  setChats,
  setLoading,
  setError,
  chatBumpedToTop,
  addChat,
  updateChat,
  removeChat,
} from "../redux/slices/chatSlice";

import socket from "../socket/socket";

function ChatList() {
  const [search, setSearch] = useState("");
  const dispatch = useDispatch();
  const { chats, loading, error } = useSelector((state) => state.chat);
  const navigate = useNavigate();
  const { token, user: currentUser } = useSelector((state) => state.auth);
  const getMessagePreview = (message) => {
    if (message?.messageType === "image") {
      return "📷 Photo";
    }
    if (message?.messageType === "file") {
      return `📎 ${message.fileName || "File"}`;
    }
    if (message?.fileUrl && message?.fileName) {
      const extension = message.fileName
        .split(".")
        .pop()
        ?.toLowerCase();
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
      ];
      if (imageExtensions.includes(extension)) {
        return "📷 Photo";
      }
      return `📎 ${message.fileName}`;
    }
    return message?.text || "";
  };
  useEffect(() => {
    const fetchChats = async () => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(""));
        const data = await getRecentChats(token);
        dispatch(setChats(data.chats));
      } catch (error) {
        console.error("Failed to fetch chats:", error);
        dispatch(
          setError(error.response?.data?.message || "Failed to load chats")
        );
      } finally {
        dispatch(setLoading(false));
      }
    };
    if (token) {
      fetchChats();
    }
  }, [token, dispatch]);
  useEffect(() => {
    console.log("CHATLIST SOCKET EFFECT:", socket.connected);
    const handleNewMessage = async (data) => {
      console.log("CHAT LIST - NEW MESSAGE:", data);
      const newMessage = data?.message;
      if (!newMessage) return;
      const senderId =
        newMessage.sender?._id?.toString() ||
        newMessage.sender?.toString();
      const receiverId =
        newMessage.receiver?._id?.toString() ||
        newMessage.receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) return;
      const otherUserId =
        senderId === currentUserId ? receiverId : senderId;
      if (!otherUserId) return;
      const existingChat = chats.find(
        (chat) =>
          chat.user._id.toString() ===
          otherUserId.toString()
      );
      if (!existingChat) {
        try {
          const data = await getUserById(
            otherUserId,
            token
          );
          const user = data.user || data;
          dispatch(
            addChat({
              user,
              lastMessage: getMessagePreview(newMessage),
              lastMessageTime: newMessage.createdAt,
              unreadCount:
                senderId !== currentUserId ? 1 : 0,
            })
          );
        } catch (error) {
          console.error(
            "Failed to add new chat:",
            error
          );
        }
        return;
      }
      dispatch(
        chatBumpedToTop({
          userId: otherUserId,
          updates: {
            lastMessage: getMessagePreview(newMessage),
            lastMessageTime: newMessage.createdAt,
          },
          incrementUnread:
            senderId !== currentUserId,
        })
      );
    };
    const handleMessageEdited = (data) => {
      const updatedMessage = data?.message;
      if (!updatedMessage) return;
      const senderId =
        updatedMessage.sender?._id?.toString() ||
        updatedMessage.sender?.toString();
      const receiverId =
        updatedMessage.receiver?._id?.toString() ||
        updatedMessage.receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) return;
      const otherUserId =
        senderId === currentUserId ? receiverId : senderId;
      dispatch(
        updateChat({
          userId: otherUserId,
          updates: {
            lastMessage: getMessagePreview(updatedMessage),
            lastMessageTime: updatedMessage.createdAt,
          },
        })
      );
    };
    const handleMessageDeleted = async (data) => {
      const { messageId, deleteFor, sender, receiver } = data;
      if (!messageId || !deleteFor) return;
      const senderId =
        sender?._id?.toString() ||
        sender?.toString();
      const receiverId =
        receiver?._id?.toString() ||
        receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) return;
      const otherUserId =
        senderId === currentUserId ? receiverId : senderId;
      if (!otherUserId) return;
      try {
        const data = await getChatPreview(otherUserId, token);
        const preview = data.preview;
        dispatch(
          updateChat({
            userId: otherUserId,
            updates: {
              lastMessage: preview.lastMessage,
              lastMessageTime: preview.lastMessageTime,
              unreadCount: preview.unreadCount,
            },
          })
        );
      } catch (error) {
        console.error("Failed to refresh chat preview:", error);
      }
    };
    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [currentUser, token, chats ,dispatch]);
  const filteredChats = chats.filter((chat) => {
    const query = search.toLowerCase();
    return (
      chat.user.name.toLowerCase().includes(query) ||
      chat.user.username.toLowerCase().includes(query)
    );
  });
  const handleChatClick = (userId) => {
    navigate(`/chat/${userId}`);
  };
  const handleDeleteChat = async (userId) => {
    const confirmed = window.confirm(
      "Delete this chat from your recent chats?"
    );
    if (!confirmed) return;
    try {
      await deleteChat(userId, token);
      dispatch(removeChat(userId));
    } catch (error) {
      console.error("Delete chat error:", error);
      alert(error.response?.data?.message || "Failed to delete chat");
    }
  };
  return (
    <aside className="w-full md:w-96 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recent Chats
        </h2>
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading && (
          <p className="text-center text-gray-400 mt-8">
            Loading chats...
          </p>
        )}
        {!loading && error && (
          <p className="text-center text-red-500 mt-8">
            {error}
          </p>
        )}
        {!loading && !error && filteredChats.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            No chats found
          </p>
        )}
        {!loading &&
          !error &&
          filteredChats.map((chat) => (
            <ChatItem
              key={chat.user._id}
              chat={{
                id: chat.user._id,
                name: chat.user.name,
                username: chat.user.username,
                message: chat.lastMessage,
                time: new Date(chat.lastMessageTime).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),
                unreadCount: chat.unreadCount,
                profileImage: chat.user.profileImage,
              }}
              onClick={() => handleChatClick(chat.user._id)}
              onDelete={handleDeleteChat}
            />
          ))}
      </div>
    </aside>
  );
}

export default ChatList;