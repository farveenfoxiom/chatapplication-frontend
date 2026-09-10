import { useEffect, useState } from "react";
import {ArrowLeft,Send,User,Trash,Pencil,X,} from "lucide-react";
import {useNavigate,useParams,} from "react-router-dom";

import {getMessages,sendMessage,deleteMessage,markMessagesAsRead,editMessage,} from "../services/messageService";
import { getUserById } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import socket from "../socket/socket";

function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const {token,user: currentUser,} = useAuth();

  const [chatUser, setChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [editingMessageId,setEditingMessageId,] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  const [deleteMessageId,setDeleteMessageId,] = useState(null);
  const [showDeleteModal,setShowDeleteModal,] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchChat = async () => {
      try {
        setLoading(true);
        setError("");
        const userData = await getUserById(userId,token);
        if (!isMounted) {
          return;
        }
        setChatUser(userData.user);
        const messageData = await getMessages(userId,token);
        if (!isMounted) {
          return;
        }
        setMessages(
          messageData.messages || []
        );
        try {
          await markMessagesAsRead(userId,token);
        } catch (readError) {
          console.error(
            "Mark messages as read error:",
            readError
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error(
          "Failed to load chat:",
          error
        );
        setError(
          error.response?.data?.message ||
            "Failed to load chat"
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    if (userId && token) {
      fetchChat();
    }
    return () => {
      isMounted = false;
    };
  }, [userId, token]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const handleOnlineStatus = (data) => {
      if (
        data.userId?.toString() ===
        userId.toString()
      ) {
        setIsOnline(data.isOnline);
      }
    };
    const handleUserOnline = (data) => {
      if (
        data.userId?.toString() ===
        userId.toString()
      ) {
        setIsOnline(true);
      }
    };
    const handleUserOffline = (data) => {
      if (
        data.userId?.toString() ===
        userId.toString()
      ) {
        setIsOnline(false);
      }
    };
    const checkOnlineStatus = () => {
      socket.emit(
        "check_user_online",
        userId
      );
    };
    socket.on("user_online_status",handleOnlineStatus);
    socket.on("user_online",handleUserOnline);
    socket.on("user_offline",handleUserOffline);
    if (socket.connected) {
      checkOnlineStatus();
    } else {
      socket.once("connect",checkOnlineStatus);
    }
    return () => {
      socket.off("user_online_status",handleOnlineStatus);
      socket.off("user_online",handleUserOnline);
      socket.off("user_offline",handleUserOffline);
      socket.off("connect",checkOnlineStatus);
    };
  }, [userId]);

  useEffect(() => {
    const handleNewMessage = async (data) => {
      const newMessage = data?.message;
      if (!newMessage) {
        return;
      }
      const messageSenderId =
        newMessage.sender?._id?.toString() ||
        newMessage.sender?.toString();
      const messageReceiverId =
        newMessage.receiver?._id?.toString() ||
        newMessage.receiver?.toString();
      const currentUserId =
        currentUser?._id?.toString() ||
        currentUser?.id?.toString();
      const isForThisChat =
        (
          messageSenderId === userId.toString() &&
          messageReceiverId ===currentUserId
        ) ||
        (
          messageSenderId === currentUserId &&
          messageReceiverId === userId.toString()
        );
      if (!isForThisChat) {
        return;
      }
      setMessages(
        (previousMessages) => {
          const alreadyExists = previousMessages.some((msg) =>
            msg._id ===
            newMessage._id
          );
          if (alreadyExists) {
            return previousMessages;
          }
          const updatedMessages = [
            ...previousMessages,
            newMessage,
          ];
          updatedMessages.sort(
            (a, b) =>
              new Date(a.createdAt) -
              new Date(b.createdAt)
          );
          return updatedMessages;
        }
      );
      try {
        await markMessagesAsRead(userId,token);
      } catch (error) {
        console.error(
          "Failed to mark realtime message as read:",
          error
        );
      }
    };
    const handleMessageEdited = (data) => {
      const updatedMessage =data?.message;
      if (!updatedMessage) {
        return;
      }
      setMessages(
        (previousMessages) =>
          previousMessages.map(
            (message) =>
              message._id ===
              updatedMessage._id
                ? updatedMessage
                : message
          )
      );
    };
    const handleMessageDeleted = (data) => {
      const messageId =data?.messageId;
      if (!messageId) {
        return;
      }
      setMessages(
        (previousMessages) =>
          previousMessages.filter(
            (message) =>
              message._id !== messageId
          )
      );
    };
    socket.on("new_message",handleNewMessage);
    socket.on("message_edited",handleMessageEdited);
    socket.on("message_deleted",handleMessageDeleted);
    return () => {
      socket.off("new_message",handleNewMessage);
      socket.off( "message_edited",handleMessageEdited);
      socket.off("message_deleted",handleMessageDeleted
      );
    };
  }, [userId,currentUser,token,]);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || sending) {
      return;
    }
    try {
      setSending(true);
      const data = await sendMessage(userId,text,token);
      setMessages(
        (previousMessages) => {
          const alreadyExists =
            previousMessages.some(
              (msg) =>
                msg._id ===
                data.message._id
            );
          if (alreadyExists) {
            return previousMessages;
          }
          return [
            ...previousMessages,
            data.message,
          ];
        }
      );
      setMessage("");
      setError("");
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );
      setError(
        error.response?.data?.message ||
          "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey
    ) {
      e.preventDefault();
      if (editingMessageId) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleDeleteMessage = (
    messageId
  ) => {
    setDeleteMessageId(messageId);
    setShowDeleteModal(true);
  };
  const handleDeleteConfirm = async (
    deleteFor
  ) => {
    if (!deleteMessageId) {
      return;
    }
    try {
      await deleteMessage(
        deleteMessageId,
        deleteFor,
        token
      );
      if (deleteFor === "me") {
        setMessages(
          (previousMessages) =>
            previousMessages.filter(
              (message) =>
                message._id !==
                deleteMessageId
            )
        );
      }
      setDeleteMessageId(null);
      setShowDeleteModal(false);
      setError("");
    } catch (error) {
      console.error(
        "Delete message error:",
        error
      );
      setError(
        error.response?.data?.message ||
          "Failed to delete message"
      );
    }
  };
  const handleDeleteCancel = () => {
    setDeleteMessageId(null);
    setShowDeleteModal(false);
  };
  const handleEditMessage = async () => {
    const text = message.trim();
    if (!text || !editingMessageId) {
      return;
    }
    try {
      const data = await editMessage(
          editingMessageId,
          text,
          token
      );
      setMessages(
        (previousMessages) =>
          previousMessages.map(
            (msg) =>
              msg._id ===
              editingMessageId
                ? data.updatedMessage
                : msg
          )
      );
      setMessage("");
      setEditingMessageId(null);
      setError("");
    } catch (error) {
      console.error(
        "Edit message error:",
        error
      );
      setError(
        error.response?.data?.message ||
          "Failed to edit message"
      );
    }
  };
  const startEditingMessage = (msg) => {
    setEditingMessageId(msg._id);
    setMessage(msg.text);
  };
  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setMessage("");
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">
          Loading chat...
        </p>
      </div>
    );
  }
  if (!chatUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            User not found
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-green-600 font-semibold">
            Go back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
          <ArrowLeft size={21} />
        </button>
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
          {chatUser.profileImage ? (
            <img
              src={`http://localhost:5000${chatUser.profileImage}`}
              alt={chatUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User size={20}
              className="text-green-600"/>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">
            {chatUser.name}
          </h2>
          <p
            className={`text-xs ${
              isOnline
                ? "text-green-500"
                : "text-gray-500"
            }`}
          >
            {isOnline
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        {error && (
          <p className="text-center text-red-500 text-sm mb-3">
            {error}
          </p>
        )}
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">
              No messages yet.
              Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-6xl mx-auto w-full">
            {messages.map((msg) => {
              const messageSenderId =
                msg.sender?._id?.toString() ||
                msg.sender?.toString();
              const currentUserId =
                currentUser?._id?.toString() ||
                currentUser?.id?.toString()
              const isMine =
                messageSenderId ===
                currentUserId;
              return (
                <div
                  key={msg._id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div className="group flex items-end gap-2">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => startEditingMessage(msg)}
                          title="Edit message"
                          className="text-gray-400 hover:text-green-500 p-1">
                          <Pencil size={16}/>                                                   
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>handleDeleteMessage(msg._id)}
                        title="Delete message"
                        className="text-gray-400 hover:text-red-500 p-1">
                        <Trash size={16} />
                      </button>
                    </div>
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                        isMine
                          ? "bg-green-500 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md"
                      }`}
                    >
                      <p className="break-words">
                        {msg.text}
                      </p>
                      {msg.isEdited && (
                        <p
                          className={`text-xs mt-1 ${
                            isMine
                              ? "text-green-100"
                              : "text-gray-400"
                          }`}
                        >
                          Edited
                        </p>

                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isMine
                            ? "text-green-100"
                            : "text-gray-400"
                        }`}
                      >
                        {new Date(
                          msg.createdAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) =>setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessageId
                ? "Edit your message..."
                : "Type a message..."
            }
            className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"/>
          {editingMessageId ? (
            <>
              <button
                type="button"
                onClick={cancelEditingMessage}
                className="w-12 h-12 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition"
                title="Cancel edit"
              >
                <X size={20} />
              </button>
              <button
                type="button"
                onClick={handleEditMessage}
                disabled={!message.trim()}
                className="px-4 h-12 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
              className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={handleDeleteCancel}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
            onClick={(e) =>e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete message
            </h3>
            <div className="space-y-2">
              {(() => {
                const selectedMessage =
                  messages.find(
                    (msg) =>
                      msg._id ===
                      deleteMessageId
                  );
                if (!selectedMessage) {
                  return null;
                }
                const messageSenderId =
                  selectedMessage.sender?._id?.toString() ||
                  selectedMessage.sender?.toString();
                const currentUserId =
                  currentUser?._id?.toString() ||
                  currentUser?.id?.toString();
                const isMine =
                  messageSenderId ===
                  currentUserId;
                return (
                  <>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() =>handleDeleteConfirm("everyone")}
                        className="w-full rounded-xl px-4 py-3 text-left text-red-600 font-medium hover:bg-red-50 transition"
                      >
                        Delete for everyone
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteConfirm( "me")}
                      className="w-full rounded-xl px-4 py-3 text-left text-gray-700 font-medium hover:bg-gray-100 transition"
                    >
                      Delete for me
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCancel}
                      className="w-full rounded-xl px-4 py-3 text-left text-gray-500 font-medium hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;