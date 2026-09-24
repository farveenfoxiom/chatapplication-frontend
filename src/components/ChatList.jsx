import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Users, UserPlus } from "lucide-react";

import SearchBar from "./SearchBar";
import ChatItem from "./ChatItem";
import CreateGroupModal from "./CreateGroupModal";

import {
  getRecentChats,
  deleteChat,
  getChatPreview,
} from "../services/chatService";

import { getUserById } from "../services/userService";
import { getUserGroups } from "../services/groupService";

import {
  setChats,
  setLoading,
  setError,
  chatBumpedToTop,
  addChat,
  updateChat,
  removeChat,
} from "../redux/slices/chatSlice";

import {
  setGroups,
  refreshGroups,
  addGroup,
  groupUpdated,
  groupMessageReceived,
  memberLeftGroup,
  groupLastMessageEdited,
} from "../redux/slices/groupSlice";

import socket from "../socket/socket";
import { API_BASE_URL, SOCKET_URL } from "../config";

function getImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

function ChatList() {
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { chats, loading, error } = useSelector((state) => state.chat);
  const { groups } = useSelector((state) => state.group);
  const { token, user: currentUser } = useSelector((state) => state.auth);

  const currentUserId =
    currentUser?._id?.toString() || currentUser?.id?.toString();

  const chatsRef = useRef(chats);
  const groupsRef = useRef(groups);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const getMessagePreview = (message) => {
    if (!message) return "";

    if (message.messageType === "image") return "📷 Photo";
    if (message.messageType === "video") return "🎥 Video";
    if (message.messageType === "audio") return "🎤 Voice message";
    if (message.messageType === "location") {
      return message.location?.isLive ? "📍 Live location" : "📍 Location";
    }

    if (message.messageType === "file") {
      return `📎 ${message.fileName || "File"}`;
    }

    if (message.fileUrl && message.fileName) {
      const extension = message.fileName.split(".").pop()?.toLowerCase();

      const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
      const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac"];
      const videoExtensions = ["mp4", "webm", "mov", "avi", "mkv"];

      if (imageExtensions.includes(extension)) return "📷 Photo";
      if (audioExtensions.includes(extension)) return "🎤 Voice message";
      if (videoExtensions.includes(extension)) return "🎥 Video";

      return `📎 ${message.fileName}`;
    }

    return message.text || "";
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(""));

        const data = await getRecentChats(token);

        dispatch(setChats(data.chats || []));
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
    const fetchGroups = async () => {
      try {
        const data = await getUserGroups(token);
        dispatch(setGroups(data.groups || []));
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      }
    };

    if (token) {
      fetchGroups();
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const handleNewMessage = async (data) => {
      const newMessage = data?.message;

      if (!newMessage) {
        return;
      }

      const groupId =
        newMessage.group?._id?.toString() || newMessage.group?.toString();

      if (groupId) {
        const senderId =
          newMessage.sender?._id?.toString() || newMessage.sender?.toString();

        const isMine = senderId === currentUserId;

        const existingGroup = groupsRef.current.find(
          (group) => group._id.toString() === groupId
        );

        if (!existingGroup) {
          return;
        }

        let message = newMessage;

        // If the sender arrives as a bare id, fetch their name for the preview
        if (senderId && typeof newMessage.sender !== "object") {
          try {
            const senderData = await getUserById(senderId, token);
            const sender = senderData.user || senderData;

            message = {
              ...newMessage,
              sender,
            };
          } catch (error) {
            console.error("Failed to fetch group message sender:", error);
          }
        }

        dispatch(
          groupMessageReceived({
            groupId,
            message,
            incrementUnread: !isMine,
          })
        );

        return;
      }

      const senderId =
        newMessage.sender?._id?.toString() || newMessage.sender?.toString();

      const receiverId =
        newMessage.receiver?._id?.toString() ||
        newMessage.receiver?.toString();

      const otherUserId = senderId === currentUserId ? receiverId : senderId;

      if (!otherUserId) {
        return;
      }

      const existingChat = chatsRef.current.find(
        (chat) => chat.user._id.toString() === otherUserId.toString()
      );

      if (!existingChat) {
        try {
          const userData = await getUserById(otherUserId, token);
          const user = userData.user || userData;

          dispatch(
            addChat({
              user,
              lastMessage: getMessagePreview(newMessage),
              lastMessageTime: newMessage.createdAt,
              unreadCount: senderId !== currentUserId ? 1 : 0,
            })
          );
        } catch (error) {
          console.error("Failed to add new chat:", error);
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
          incrementUnread: senderId !== currentUserId,
        })
      );
    };

    const handleMessageEdited = (data) => {
      const updatedMessage = data?.message;

      if (!updatedMessage) {
        return;
      }

      const groupId =
        updatedMessage.group?._id?.toString() ||
        updatedMessage.group?.toString();

      if (groupId) {
        dispatch(
          groupLastMessageEdited({
            groupId,
            message: updatedMessage,
          })
        );

        return;
      }

      const senderId =
        updatedMessage.sender?._id?.toString() ||
        updatedMessage.sender?.toString();

      const receiverId =
        updatedMessage.receiver?._id?.toString() ||
        updatedMessage.receiver?.toString();

      const otherUserId = senderId === currentUserId ? receiverId : senderId;

      if (!otherUserId) {
        return;
      }

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
      const { messageId, deleteFor, sender, receiver, group } = data || {};

      if (!messageId || !deleteFor) {
        return;
      }

      const groupId = group?._id?.toString() || group?.toString();

      if (groupId) {
        // Ask the server for the real last message + unread count
        try {
          const groupData = await getUserGroups(token);
          dispatch(refreshGroups(groupData.groups || []));
        } catch (error) {
          console.error("Failed to refresh groups after delete:", error);
        }

        return;
      }

      const senderId = sender?._id?.toString() || sender?.toString();

      const receiverId = receiver?._id?.toString() || receiver?.toString();

      const otherUserId = senderId === currentUserId ? receiverId : senderId;

      if (!otherUserId) {
        return;
      }

      try {
        const previewData = await getChatPreview(otherUserId, token);
        const preview = previewData.preview;

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

    const handleGroupCreated = (data) => {
      if (!data?.group) return;

      dispatch(addGroup(data.group));
    };

    const handleGroupUpdated = (data) => {
      if (!data?.group) return;

      dispatch(groupUpdated(data.group));
    };

    const handleMemberLeft = (data) => {
      if (!data?.groupId) return;

      dispatch(memberLeftGroup(data));
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("group_created", handleGroupCreated);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("member_left", handleMemberLeft);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("group_created", handleGroupCreated);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("member_left", handleMemberLeft);
    };
  }, [currentUserId, token, dispatch]);

  const query = search.toLowerCase();

  const combinedItems = [
    ...chats.map((chat) => ({
      type: "chat",
      data: chat,
      time: new Date(chat.lastMessageTime || 0).getTime(),
    })),
    ...groups.map((group) => ({
      type: "group",
      data: group,
      time: new Date(group.lastMessageTime || 0).getTime(),
    })),
  ]
    .filter((item) => {
      if (item.type === "chat") {
        return (
          item.data.user.name.toLowerCase().includes(query) ||
          item.data.user.username.toLowerCase().includes(query)
        );
      }

      return item.data.name.toLowerCase().includes(query);
    })
    .filter((item) => {
      if (activeTab === "unread") {
        return item.data.unreadCount > 0;
      }

      if (activeTab === "contacts") {
        return item.type === "chat";
      }

      if (activeTab === "groups") {
        return item.type === "group";
      }

      return true;
    })
    .sort((a, b) => b.time - a.time);

  const handleChatClick = (userId) => {
    navigate(`/chat/${userId}`);
  };

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleDeleteChat = async (userId) => {
    const confirmed = window.confirm("Delete this chat from your recent chats?");

    if (!confirmed) return;

    try {
      await deleteChat(userId, token);

      dispatch(removeChat(userId));
    } catch (error) {
      console.error("Delete chat error:", error);

      alert(error.response?.data?.message || "Failed to delete chat");
    }
  };

  const contactsForNewGroup = chats.map((chat) => chat.user);

  const tabs = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "contacts", label: "Contacts" },
    { id: "groups", label: "Groups" },
  ];

  return (
    <aside className="w-full md:w-96 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Chats</h2>

          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition"
            title="Create a new group"
          >
            <UserPlus size={18} />
            New Group
          </button>
        </div>

        <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading && (
          <p className="text-center text-gray-400 mt-8">Loading chats...</p>
        )}

        {!loading && error && (
          <p className="text-center text-red-500 mt-8">{error}</p>
        )}

        {!loading && !error && combinedItems.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            {activeTab === "unread"
              ? "No unread chats"
              : activeTab === "contacts"
              ? "No contacts found"
              : activeTab === "groups"
              ? "No groups found"
              : "No chats found"}
          </p>
        )}

        {!loading && !error && combinedItems.length > 0 && (
          <div>
            {combinedItems.map((item) => {
              if (item.type === "chat") {
                const chat = item.data;

                return (
                  <ChatItem
                    key={`chat-${chat.user._id}`}
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
                );
              }

              const group = item.data;

              return (
                <button
                  key={`group-${group._id}`}
                  type="button"
                  onClick={() => handleGroupClick(group._id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                    {group.groupImage ? (
                      <img
                        src={getImageUrl(group.groupImage)}
                        alt={group.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";

                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display =
                              "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className={`w-12 h-12 rounded-full bg-green-100 items-center justify-center ${
                        group.groupImage ? "hidden" : "flex"
                      }`}
                    >
                      <Users size={20} className="text-green-600" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {group.name}
                      </p>

                      {group.lastMessageTime && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(group.lastMessageTime).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-gray-500 truncate">
                        {group.lastMessage
                          ? `${
                              group.lastMessage.sender?._id?.toString() ===
                              currentUserId
                                ? "You"
                                : group.lastMessage.sender?.name || "Unknown"
                            }: ${getMessagePreview(group.lastMessage)}`
                          : `${group.members?.length || 0} members`}
                      </p>

                      {group.unreadCount > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">
                          {group.unreadCount > 99 ? "99+" : group.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          users={contactsForNewGroup}
          token={token}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </aside>
  );
}

export default ChatList;