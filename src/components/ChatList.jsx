import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SearchBar from "./SearchBar";
import ChatItem from "./ChatItem";
import { getRecentChats,deleteChat,getChatPreview } from "../services/chatService";
import { useAuth } from "../context/AuthContext";

import socket from "../socket/socket";

function ChatList() {
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { token , user : currentUser } = useAuth();
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getRecentChats(token);
        setChats(data.chats);
      } catch (error) {
        console.error("Failed to fetch chats:", error);
        setError(
          error.response?.data?.message ||
          "Failed to load chats"
        );
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchChats();
    }
  }, [token]);

  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log("CHAT LIST - MESSAGE EDITED:", data);
      const newMessage = data?.message;
      if (!newMessage) {
        return;
      }
      const senderId =
        newMessage.sender?._id?.toString() ||
        newMessage.sender?.toString();
      const receiverId =
        newMessage.receiver?._id?.toString() ||
        newMessage.receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) {
        return;
      }
      const otherUserId =
        senderId === currentUserId
          ? receiverId
          : senderId;
      setChats((previousChats) => {
        const existingChat = previousChats.find(
          (chat) =>
            chat.user._id.toString() ===
            otherUserId.toString()
        );
        if (!existingChat) {
          return previousChats;
        }
        const updatedChat = {
          ...existingChat,
          lastMessage: newMessage.text,
          lastMessageTime: newMessage.createdAt,
          unreadCount :
             senderId !== currentUserId 
               ? (existingChat.unreadCount || 0) + 1 
               : existingChat.unreadCount || 0,
        };
        const remainingChats = previousChats.filter(
          (chat) =>
            chat.user._id.toString() !==
            otherUserId.toString()
        );
        return [
          updatedChat,
          ...remainingChats,
        ];
      });
    };
    const handleMessageEdited = (data) => {
      const updatedMessage = data?.message;
      if (!updatedMessage) {
        return;
      }
      const senderId =
        updatedMessage.sender?._id?.toString() ||
        updatedMessage.sender?.toString();
      const receiverId =
        updatedMessage.receiver?._id?.toString() ||
        updatedMessage.receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) {
        return;
      }
      const otherUserId =
        senderId === currentUserId
          ? receiverId
          : senderId;
      setChats((previousChats) => {
        return previousChats.map((chat) => {
          const chatUserId =
            chat.user._id.toString();
          if (chatUserId !== otherUserId) {
            return chat;
          }
          return {
            ...chat,
            lastMessage: updatedMessage.text,
            lastMessageTime:
              updatedMessage.createdAt,
            unreadCount : chat.unreadCount || 0,
          };
        });
      });
    };
    const handleMessageDeleted = async (data) => {
      const { messageId, deleteFor, sender, receiver } = data;
      if (!messageId || !deleteFor) {
        return;
      }
      const senderId =
        sender?._id?.toString() ||
        sender?.toString();
      const receiverId =
        receiver?._id?.toString() ||
        receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      if (!currentUserId) {
        return;
      }
      const otherUserId =
        senderId === currentUserId
          ? receiverId
          : senderId;
      if (!otherUserId) {
        return;
      }
      try {
        const data = await getChatPreview(otherUserId, token);
        const preview = data.preview;
        setChats((previousChats) => {
          return previousChats.map((chat) => {
            const chatUserId =
              chat.user._id.toString();
            if (chatUserId !== otherUserId) {
              return chat;
            }
            return {
              ...chat,
              lastMessage: preview.lastMessage,
              lastMessageTime:
                preview.lastMessageTime ||
                chat.lastMessageTime,
              unreadCount: preview.unreadCount,
            };
          });
        });
      } catch (error) {
        console.error(
          "Failed to refresh chat preview:",
          error
        );
      }
    };
    socket.on("new_message",handleNewMessage);
    socket.on("message_edited",handleMessageEdited);
    socket.on("message_deleted",handleMessageDeleted);
    return () => {
      socket.off("new_message",handleNewMessage);
      socket.off("message_edited",handleMessageEdited);
      socket.off("message_deleted",handleMessageDeleted);
    };
  }, [currentUser, token]);

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
    if (!confirmed) {
      return;
    }
    try {
      await deleteChat(userId, token);
      setChats((previousChats) =>
        previousChats.filter(
          (chat) => chat.user._id !== userId
        )
      );
    } catch (error) {
      console.error("Delete chat error:", error);
      alert(
        error.response?.data?.message ||
          "Failed to delete chat"
      );
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
          onChange={(e) => setSearch(e.target.value)}/>
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
                time: new Date(
                  chat.lastMessageTime
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                unreadCount : chat.unreadCount,
                profileImage : chat.user.profileImage,
              }}
              onClick={() => handleChatClick(chat.user._id)}
              onDelete={handleDeleteChat}/>
          ))}
      </div>
    </aside>
  );
}

export default ChatList;