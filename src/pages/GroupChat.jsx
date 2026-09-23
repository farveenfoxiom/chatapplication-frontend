import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Users,
  Trash,
  Pencil,
  X,
  Paperclip,
  Download,
  FileText,
  ChevronDown,
  Video,
  Camera,
  Image as ImageIcon,
  MoreVertical,
  MapPin,
  Mic,
  Check,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  getGroupById,
  getGroupMessages,
  markGroupMessagesAsRead,
  sendGroupMessage,
  sendGroupLocationMessage,
  clearGroupChat as clearGroupChatApi,
} from "../services/groupService";
import { getUserById } from "../services/userService";
import LocationMap from "../components/LocationMap";
import ShareLocationModal from "../components/shareLocationModal";
import LocationPreviewModal from "../components/LocationPreviewModal";
import { deleteMessage, editMessage } from "../services/messageService";
import socket from "../socket/socket";
import {
  groupUpdated,
  memberLeftGroup,
  clearGroupUnread,
  removeGroup,
  clearGroupChat,
} from "../redux/slices/groupSlice";

const API_BASE_URL = "http://localhost:5000";
const MESSAGE_LIMIT = 20;

/* -------------------------------------------------------
   AudioPlayer
   Same voice-message style used by Chat.jsx, but adapted
   for group messages. A group member is considered to have
   played/read the audio when their id exists in playedBy/readBy.
------------------------------------------------------- */
const AudioPlayer = ({
  src,
  isMine,
  isRead,
  isDelivered,
  isPlayed,
  messageId,
  time,
  senderAvatar,
  onOpenReadRecipients,
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [played, setPlayed] = useState(isPlayed || false);

  useEffect(() => {
    setPlayed(isPlayed);
  }, [isPlayed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch((error) => console.error("Audio play error:", error));
      setIsPlaying(true);

      if (!isMine && !played) {
        setPlayed(true);
        socket.emit("mark_audio_played", { messageId });
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const heights = [
    12, 20, 14, 28, 16, 24, 10, 18, 22, 14, 26, 12, 18, 24, 16, 22, 14, 20, 26,
  ];

    return (
    <div
      className={`relative flex items-center gap-3 w-[300px] max-w-full p-2.5 rounded-xl ${
        isMine
          ? "bg-green-500 text-white rounded-tr-none"
          : "bg-white text-gray-900 rounded-tl-none shadow-sm"
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Users size={22} className="text-gray-500" />
          )}
        </div>
        <div
          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
            played ? "bg-blue-500 text-white" : "bg-green-500 text-white"
          }`}
        >
          <Mic size={11} />
        </div>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
          isMine
            ? "text-white hover:text-white/80"
            : "text-gray-600 hover:text-gray-800"
        }`}
      >
        {isPlaying ? (
          <span className="text-sm font-bold">❚❚</span>
        ) : (
          <span className="text-sm font-bold ml-0.5">▶</span>
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="relative flex items-center gap-[2px] h-6 group">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {Array.from({ length: 19 }).map((_, index) => {
            const barPosition = (index / 19) * 100;
            const isActive = barPosition <= progress;
            const heightPx = heights[index % heights.length];

            return (
              <div
                key={index}
                style={{ height: `${heightPx}px` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isActive
                    ? played
                      ? "bg-blue-300"
                      : isMine
                      ? "bg-white"
                      : "bg-green-600"
                    : isMine
                    ? "bg-white/30"
                    : "bg-gray-300"
                }`}
              />
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between text-[11px] leading-none ${
            isMine ? "text-white/80" : "text-gray-500"
          }`}
        >
          <span>{formatTime(isPlaying ? currentTime : duration)}</span>

          <div className="flex items-center gap-1">
            <span>{time}</span>
            {isMine && (
              <button
                type="button"
                onClick={onOpenReadRecipients}
                className={`text-xs tracking-[-3px] hover:opacity-80 ${
                  isRead ? "text-blue-500 font-bold" : "text-white/80"
                }`}
                title="Read recipients"
              >
                {isDelivered || isRead ? "✓✓" : "✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function GroupChat() {
  console.log("GROUPCHAT FILE VERSION CHECK — audio + read recipients v4");

  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { token, user: currentUser } = useSelector(
    (state) => state.auth
  );

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [downloadedMessageIds, setDownloadedMessageIds] = useState(
    new Set()
  );

  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingSeconds, setAudioRecordingSeconds] = useState(0);

  const audioMediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioTimerRef = useRef(null);
  const audioDiscardedRef = useRef(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [sending, setSending] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [showShareLocationModal, setShowShareLocationModal] = useState(false);
  const [locationPreview, setLocationPreview] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);

  const [readRecipientsMessage, setReadRecipientsMessage] = useState(null);
  const [showReadRecipientsModal, setShowReadRecipientsModal] = useState(false);

  const liveLocationWatchIdRef = useRef(null);
  const liveLocationMessageIdRef = useRef(null);
  const liveLocationTimeoutRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const messagesContentRef = useRef(null);
  const messagesRef = useRef([]);
  const resizeObserverRef = useRef(null);
  const messagesEndRef = useRef(null);

  const topSentinelRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const isLoadingOlderMessagesRef = useRef(false);
  const hasMoreMessagesRef = useRef(true);

  const currentUserId =
    currentUser?._id?.toString() || currentUser?.id?.toString();

  useEffect(() => {
    hasMoreMessagesRef.current = hasMoreMessages;
  }, [hasMoreMessages]);

  const getId = (value) =>
    value?._id?.toString() || value?.id?.toString() || value?.toString();

  const getReadIds = (msg) =>
    (msg?.readBy || []).map((item) => getId(item)).filter(Boolean);

  const getPlayedIds = (msg) =>
    (msg?.playedBy || []).map((item) => getId(item)).filter(Boolean);

  const getReadRecipients = (msg) => {
    if (!group?.members?.length) return [];

    const readIds = new Set(getReadIds(msg));

    return group.members.filter((member) => {
      const memberId = getId(member);
      return memberId && readIds.has(memberId);
    });
  };

  const hasOtherReaders = (msg) =>
    getReadRecipients(msg).some(
      (member) => getId(member) !== currentUserId
    );

  const openReadRecipients = (msg) => {
    if (!msg || !currentUserId) return;
    setReadRecipientsMessage(msg);
    setShowReadRecipientsModal(true);
  };

  const closeReadRecipients = () => {
    setReadRecipientsMessage(null);
    setShowReadRecipientsModal(false);
  };

  const addCurrentUserToReadBy = (msg) => {
    if (!currentUserId || !msg) return msg;

    const currentReadIds = getReadIds(msg);

    if (currentReadIds.includes(currentUserId)) {
      return msg;
    }

    return {
      ...msg,
      readBy: [...(msg.readBy || []), currentUserId],
    };
  };

  const scrollToBottom = (smooth = true) => {
    isNearBottomRef.current = true;

    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });

    setShowScrollButton(false);
  };

  const loadOlderMessages = useCallback(async () => {
    if (
      isLoadingOlderMessagesRef.current ||
      !hasMoreMessagesRef.current
    ) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

    const currentMessages = messagesRef.current;
    if (!currentMessages.length) return;

    const oldestMessage = currentMessages[0];
    if (!oldestMessage?.createdAt) return;

    try {
      isLoadingOlderMessagesRef.current = true;
      setLoadingOlderMessages(true);

      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;

      const messageData = await getGroupMessages(
        groupId,
        token,
        MESSAGE_LIMIT,
        oldestMessage.createdAt
      );

      const olderMessages = messageData.messages || [];
      const nextHasMore =
        messageData.hasMore ?? olderMessages.length === MESSAGE_LIMIT;

      setHasMoreMessages(nextHasMore);
      hasMoreMessagesRef.current = nextHasMore;

      if (!olderMessages.length) return;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));
        const uniqueOlderMessages = olderMessages.filter(
          (item) => !existingIds.has(item._id)
        );

        if (!uniqueOlderMessages.length) return prev;

        const updatedMessages = [...uniqueOlderMessages, ...prev];
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop =
            newScrollHeight - oldScrollHeight + oldScrollTop;
        });
      });
    } catch (err) {
      console.error("Load older group messages error:", err);
      setError(
        err.response?.data?.message || "Failed to load older messages"
      );
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [groupId, token]);

  const handleScroll = (e) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;

    const distanceFromBottom =
      scrollHeight - scrollTop - clientHeight;

    const isAtBottom = distanceFromBottom < 100;

    isNearBottomRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchGroupChat = async () => {
      try {
        setLoading(true);
        setError("");
        setHasMoreMessages(true);
        hasMoreMessagesRef.current = true;
        messagesRef.current = [];
        setMessages([]);
        isInitialLoadRef.current = true;
        isNearBottomRef.current = true;
        isLoadingOlderMessagesRef.current = false;

        const groupData = await getGroupById(groupId, token);

        if (!isMounted) return;

        setGroup(groupData.group);

        await markGroupMessagesAsRead(groupId, token);

        if (!isMounted) return;

        dispatch(clearGroupUnread(groupId));

        const messageData = await getGroupMessages(
          groupId,
          token,
          MESSAGE_LIMIT
        );

        if (!isMounted) return;

        const initialMessages = (messageData.messages || []).map((msg) => {
          const senderId = getId(msg.sender);

          if (senderId !== currentUserId) {
            return addCurrentUserToReadBy(msg);
          }

          return msg;
        });

        messagesRef.current = initialMessages;
        setMessages(initialMessages);

        const nextHasMore =
          messageData.hasMore ?? initialMessages.length === MESSAGE_LIMIT;

        setHasMoreMessages(nextHasMore);
        hasMoreMessagesRef.current = nextHasMore;

        socket.emit("join_group", groupId);
      } catch (err) {
        if (!isMounted) return;

        console.error("Failed to load group chat:", err);
        setError(
          err.response?.data?.message || "Failed to load group chat"
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (groupId && token) {
      fetchGroupChat();
    }

    return () => {
      isMounted = false;
    };
  }, [groupId, token, dispatch, currentUserId]);

  useEffect(() => {
    const handleNewMessage = async (data) => {
      const newMessage = data?.message;
      if (!newMessage) return;

      const messageGroupId =
        newMessage.group?._id?.toString() ||
        newMessage.group?.toString();

      if (messageGroupId !== groupId) return;

      let messageWithSender = newMessage;

      const senderId = getId(newMessage.sender);
      const senderName = newMessage.sender?.name;

      if (senderId && !senderName) {
        try {
          const userData = await getUserById(senderId, token);
          const user = userData.user || userData;

          messageWithSender = {
            ...newMessage,
            sender: user,
          };
        } catch (err) {
          console.error("Failed to fetch sender:", err);
        }
      }

      if (senderId !== currentUserId) {
        messageWithSender = addCurrentUserToReadBy(messageWithSender);

        try {
          await markGroupMessagesAsRead(groupId, token);
          dispatch(clearGroupUnread(groupId));
        } catch (err) {
          console.error("Failed to mark realtime group message as read:", err);
        }
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) => m._id === messageWithSender._id
        );

        if (alreadyExists) return prev;

        const updatedMessages = [...prev, messageWithSender];
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleMessageEdited = (data) => {
      const updated = data?.message;
      if (!updated) return;

      const messageGroupId =
        updated.group?._id?.toString() || updated.group?.toString();

      if (messageGroupId !== groupId) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m._id === updated._id ? updated : m
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleMessageDeleted = (data) => {
      const messageId = data?.messageId;
      if (!messageId) return;

      setMessages((prev) => {
        const updatedMessages = prev.filter(
          (m) => m._id !== messageId
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleGroupUpdated = (data) => {
      if (data?.group?._id === groupId) {
        setGroup(data.group);
        dispatch(groupUpdated(data.group));
      }
    };

    const handleMemberLeft = (data) => {
      if (data?.groupId === groupId) {
        dispatch(memberLeftGroup(data));

        setGroup((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.filter(
                  (m) => getId(m) !== data.userId?.toString()
                ),
              }
            : prev
        );
      }
    };

    const handleAudioMarkedPlayed = (data) => {
      const { messageId, playedBy, userId } = data || {};
      if (!messageId) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          if (msg._id?.toString() !== messageId.toString()) {
            return msg;
          }

          const existingPlayedIds = getPlayedIds(msg);
          const existingReadIds = getReadIds(msg);
          const nextPlayedIds = playedBy?.length
            ? playedBy.map((id) => getId(id)).filter(Boolean)
            : userId
            ? Array.from(
                new Set([...existingPlayedIds, userId.toString()])
              )
            : existingPlayedIds;

          const nextReadIds = userId
            ? Array.from(
                new Set([...existingReadIds, userId.toString()])
              )
            : existingReadIds;

          return {
            ...msg,
            playedBy: nextPlayedIds,
            readBy: nextReadIds,
            isPlayed:
              userId?.toString() === currentUserId
                ? true
                : msg.isPlayed,
          };
        });

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleGroupMessagesRead = (data) => {
      const eventGroupId = data?.groupId?.toString();
      const userId = data?.userId?.toString();

      if (eventGroupId !== groupId || !userId) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          const senderId = getId(msg.sender);

          if (senderId === userId || !senderId) return msg;
          if (senderId !== currentUserId) return msg;

          return {
            ...msg,
            readBy: Array.from(
              new Set([...getReadIds(msg), userId])
            ),
          };
        });

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleLocationUpdate = (data) => {
      const { messageId, latitude, longitude, lastUpdatedAt } = data || {};
      if (!messageId) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                location: {
                  ...m.location,
                  latitude,
                  longitude,
                  lastUpdatedAt,
                },
              }
            : m
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    const handleLocationShareStopped = (data) => {
      const { messageId } = data || {};
      if (!messageId) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                location: {
                  ...m.location,
                  isLive: false,
                },
              }
            : m
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("member_left", handleMemberLeft);
    socket.on("audio_marked_played", handleAudioMarkedPlayed);
    socket.on("group_messages_read", handleGroupMessagesRead);
    socket.on("location_update", handleLocationUpdate);
    socket.on("location_share_stopped", handleLocationShareStopped);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("member_left", handleMemberLeft);
      socket.off("audio_marked_played", handleAudioMarkedPlayed);
      socket.off("group_messages_read", handleGroupMessagesRead);
      socket.off("location_update", handleLocationUpdate);
      socket.off("location_share_stopped", handleLocationShareStopped);
    };
  }, [groupId, token, dispatch, currentUserId]);

  useEffect(() => {
    if (!messages.length) {
      setShowScrollButton(false);
    }
  }, [messages]);

  const setMessagesContentRef = (node) => {
    messagesContentRef.current = node;

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (!node) return;

    const observer = new ResizeObserver(() => {
      if (isInitialLoadRef.current) {
        scrollToBottom(false);
        isInitialLoadRef.current = false;
        return;
      }

      if (
        isNearBottomRef.current &&
        !isLoadingOlderMessagesRef.current
      ) {
        scrollToBottom(false);
      }
    });

    observer.observe(node);
    resizeObserverRef.current = observer;

    if (isInitialLoadRef.current) {
      scrollToBottom(false);
      isInitialLoadRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const root = messagesContainerRef.current;
    const node = topSentinelRef.current;

    if (!root || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          entry?.isIntersecting &&
          hasMoreMessagesRef.current &&
          !isLoadingOlderMessagesRef.current
        ) {
          loadOlderMessages();
        }
      },
      { root, threshold: 0 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [loadOlderMessages, loading]);

  useEffect(() => {
    if (loading) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const needsMore =
      container.scrollHeight <= container.clientHeight &&
      hasMoreMessagesRef.current &&
      !isLoadingOlderMessagesRef.current;

    if (needsMore) {
      loadOlderMessages();
    }
  }, [messages, loading, loadOlderMessages]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");

    const maxSize = isVideo
      ? 50 * 1024 * 1024
      : isAudio
      ? 10 * 1024 * 1024
      : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        isVideo
          ? "Video must be less than 50 MB"
          : isAudio
          ? "Audio must be less than 10 MB"
          : "File size must be less than 5 MB"
      );

      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setSelectedFilePreview(null);
  };

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreview(null);
      return;
    }

    const isPreviewable =
      selectedFile.type.startsWith("image/") ||
      selectedFile.type.startsWith("video/");

    if (!isPreviewable) {
      setSelectedFilePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedFile]);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const openCamera = async (mode = "photo") => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Camera is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video",
      });

      cameraStreamRef.current = stream;
      setCameraMode(mode);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera access error:", err);

      if (err.name === "NotAllowedError") {
        alert("Camera permission was denied. Please allow camera access.");
      } else if (err.name === "NotFoundError") {
        alert("No camera was found on this device.");
      } else if (err.name === "NotReadableError") {
        alert("Camera is already being used by another application.");
      } else {
        alert("Unable to access camera.");
      }
    }
  };

  useEffect(() => {
    if (!showCamera) return;

    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;

    if (!video || !stream) return;

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play().catch((err) =>
        console.error("Video play error:", err)
      );
    };

    return () => {
      video.onloadedmetadata = null;
    };
  }, [showCamera]);

  const closeCamera = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const stream = cameraStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];
    setShowCamera(false);
  };

  const pickSupportedMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    return (
      candidates.find(
        (type) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported?.(type)
      ) || ""
    );
  };

  const startRecording = () => {
    const stream = cameraStreamRef.current;

    if (!stream) {
      alert("Camera is not ready yet.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert("Video recording is not supported by this browser.");
      return;
    }

    const mimeType = pickSupportedMimeType();
    recordedChunksRef.current = [];

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const chunks = recordedChunksRef.current;
      recordedChunksRef.current = [];

      if (!chunks.length) return;

      const baseType = (mimeType || "video/webm")
        .split(";")[0]
        .trim();

      const blob = new Blob(chunks, { type: baseType });

      const extension = baseType.includes("mp4") ? "mp4" : "webm";

      const file = new File(
        [blob],
        `video-${Date.now()}.${extension}`,
        { type: baseType }
      );

      setSelectedFile(file);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;

    setIsRecording(true);
    setRecordingSeconds(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    const stream = cameraStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setRecordingSeconds(0);
    setShowCamera(false);
  };

  const formatRecordingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      alert("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File(
          [blob],
          `camera-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        setSelectedFile(file);
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const pickSupportedAudioMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    return (
      candidates.find(
        (type) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported?.(type)
      ) || ""
    );
  };

  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Audio recording is not supported by this browser.");
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        alert("Audio recording is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      audioDiscardedRef.current = false;

      const mimeType = pickSupportedAudioMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
          audioTimerRef.current = null;
        }

        if (audioStreamRef.current) {
          audioStreamRef.current
            .getTracks()
            .forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        setIsRecordingAudio(false);
        setAudioRecordingSeconds(0);

        if (audioDiscardedRef.current || !chunks.length) {
          return;
        }

        const baseType = (mimeType || "audio/webm")
          .split(";")[0]
          .trim();

        const blob = new Blob(chunks, { type: baseType });

        const extension = baseType.includes("ogg")
          ? "ogg"
          : baseType.includes("mp4")
          ? "m4a"
          : "webm";

        const file = new File(
          [blob],
          `voice-${Date.now()}.${extension}`,
          { type: baseType }
        );

        sendGroupAudioMessage(file);
      };

      recorder.start();
      audioMediaRecorderRef.current = recorder;

      setIsRecordingAudio(true);
      setAudioRecordingSeconds(0);

      audioTimerRef.current = setInterval(() => {
        setAudioRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Audio recording error:", err);

      if (err.name === "NotAllowedError") {
        alert("Microphone permission was denied.");
      } else if (err.name === "NotFoundError") {
        alert("No microphone was found.");
      } else {
        alert("Unable to access microphone.");
      }
    }
  };

  const stopAudioRecording = () => {
    if (
      audioMediaRecorderRef.current &&
      audioMediaRecorderRef.current.state !== "inactive"
    ) {
      audioMediaRecorderRef.current.stop();
    }
  };

  const discardAudioRecording = () => {
    audioDiscardedRef.current = true;
    if (audioMediaRecorderRef.current?.state !== "inactive") {
      audioMediaRecorderRef.current.stop();
    }
  };

  const confirmAudioRecording = () => {
    audioDiscardedRef.current = false;
    if(audioMediaRecorderRef.current?.state !== "inactive") {
      audioMediaRecorderRef.current.stop();
    }
  };

  const cancelAudioRecording = () => {
    audioDiscardedRef.current = true;

    if (
      audioMediaRecorderRef.current &&
      audioMediaRecorderRef.current.state !== "inactive"
    ) {
      audioMediaRecorderRef.current.stop();
    }

    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setAudioRecordingSeconds(0);
  };

  const formatAudioRecordingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const sendGroupAudioMessage = async (file) => {
    try {
      setSending(true);
      setError("");

      const data = await sendGroupMessage(
        groupId,
        "",
        token,
        file
      );

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) => m._id === data.message._id
        );

        if (alreadyExists) return prev;

        const updatedMessages = [...prev, data.message];
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      isNearBottomRef.current = true;
    } catch (err) {
      console.error("Send group audio error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to send voice message"
      );
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      const cameraStream = cameraStreamRef.current;

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      if (
        audioMediaRecorderRef.current &&
        audioMediaRecorderRef.current.state !== "inactive"
      ) {
        audioMediaRecorderRef.current.stop();
      }

      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }

      const audioStream = audioStreamRef.current;

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSendMessage = async () => {
    const text = message.trim();

    if ((!text && !selectedFile) || sending) return;

    try {
      setSending(true);

      const data = await sendGroupMessage(
        groupId,
        text,
        token,
        selectedFile
      );

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) => m._id === data.message._id
        );

        if (alreadyExists) return prev;

        const updatedMessages = [...prev, data.message];
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      isNearBottomRef.current = true;
      setMessage("");
      setSelectedFile(null);
      setSelectedFilePreview(null);
      setError("");
    } catch (err) {
      console.error("Send group message error:", err);

      setError(
        err.response?.data?.message || "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const stopLiveLocationTracking = () => {
    if (liveLocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      liveLocationWatchIdRef.current = null;
    }

    if (liveLocationTimeoutRef.current !== null) {
      clearTimeout(liveLocationTimeoutRef.current);
      liveLocationTimeoutRef.current = null;
    }

    liveLocationMessageIdRef.current = null;
  };

  const startLiveLocationTracking = (messageId, durationMinutes) => {
    stopLiveLocationTracking();

    liveLocationMessageIdRef.current = messageId;

    liveLocationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (liveLocationMessageIdRef.current !== messageId) return;

        socket.emit("send_location_update", {
          messageId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => console.error("watchPosition error:", err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    liveLocationTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_location_share", { messageId });
      stopLiveLocationTracking();
    }, durationMinutes * 60000);
  };

  const sendLocationWithOptions = (durationMinutes) => {
    setShowShareLocationModal(false);

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPreview({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isLive: Boolean(durationMinutes),
          durationMinutes,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          alert("Location permission was denied.");
        } else {
          alert("Unable to get your location.");
        }
      }
    );
  };

  const cancelLocationPreview = () => {
    setLocationPreview(null);
  };

  const confirmSendLocation = async () => {
    if (!locationPreview || sendingLocation) return;

    try {
      setSendingLocation(true);

      const { latitude, longitude, isLive, durationMinutes } =
        locationPreview;

      const data = await sendGroupLocationMessage(
        groupId,
        latitude,
        longitude,
        token,
        isLive,
        durationMinutes
      );

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) => m._id === data.message._id
        );

        if (alreadyExists) return prev;

        const updatedMessages = [...prev, data.message];
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      isNearBottomRef.current = true;

      if (isLive) {
        startLiveLocationTracking(
          data.message._id,
          durationMinutes
        );
      }

      setLocationPreview(null);
    } catch (err) {
      console.error("Send location error:", err);
      setError(
        err.response?.data?.message || "Failed to send location"
      );
    } finally {
      setSendingLocation(false);
    }
  };

  const handleSendLocation = () => {
    setShowAttachMenu(false);
    setShowShareLocationModal(true);
  };

  const handleStopSharingLocation = (messageId) => {
    socket.emit("stop_location_share", { messageId });

    if (liveLocationMessageIdRef.current === messageId) {
      stopLiveLocationTracking();
    }
  };

  useEffect(() => {
    return () => stopLiveLocationTracking();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (editingMessageId) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleDeleteMessage = (messageId) => {
    setDeleteMessageId(messageId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (deleteFor) => {
    if (!deleteMessageId) return;

    try {
      await deleteMessage(deleteMessageId, deleteFor, token);

      setMessages((prev) => {
        const updatedMessages = prev.filter(
          (m) => m._id !== deleteMessageId
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      setDeleteMessageId(null);
      setShowDeleteModal(false);
      setError("");
    } catch (err) {
      console.error("Delete message error:", err);

      setError(
        err.response?.data?.message || "Failed to delete message"
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeleteMessageId(null);
    setShowDeleteModal(false);
  };

  const handleEditMessage = async () => {
    const text = message.trim();

    if (!text || !editingMessageId) return;

    try {
      const data = await editMessage(
        editingMessageId,
        text,
        token
      );

      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m._id === data.updatedMessage._id
            ? data.updatedMessage
            : m
        );

        messagesRef.current = updatedMessages;
        return updatedMessages;
      });

      setMessage("");
      setEditingMessageId(null);
      setError("");
    } catch (err) {
      console.error("Edit message error:", err);

      setError(
        err.response?.data?.message || "Failed to edit message"
      );
    }
  };

  const handleClearChat = async () => {
    if (clearingChat) return;

    try {
      setClearingChat(true);
      setError("");

      await clearGroupChatApi(groupId, token);

      messagesRef.current = [];
      setMessages([]);
      setHasMoreMessages(false);
      hasMoreMessagesRef.current = false;

      dispatch(clearGroupChat(groupId));
      dispatch(clearGroupUnread(groupId));

      setShowClearChatModal(false);
      setShowGroupMenu(false);

      requestAnimationFrame(() => scrollToBottom(false));
    } catch (err) {
      console.error("Clear group chat error:", err);

      setError(
        err.response?.data?.message || "Failed to clear chat"
      );
    } finally {
      setClearingChat(false);
    }
  };

  const startEditingMessage = (msg) => {
    if (msg.messageType !== "text") return;

    setEditingMessageId(msg._id);
    setMessage(msg.text);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setMessage("");
  };

  const downloadFile = async (fileUrl, fileName, messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}${fileUrl}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName || "download";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      if (messageId) {
        setDownloadedMessageIds(
          (prev) => new Set(prev).add(messageId)
        );
      }
    } catch (err) {
      console.error("File download error:", err);
    }
  };

  const isImageMessage = (msg) => {
    if (msg.messageType === "image") return true;

    const fileName = msg.fileName?.toLowerCase() || "";

    return [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
    ].some((ext) => fileName.endsWith(ext));
  };

  const isAudioMessage = (msg) => {
    if (msg.messageType === "audio") return true;

    const fileName = msg.fileName?.toLowerCase() || "";

    return [
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".aac",
      ".webm",
    ].some((ext) => fileName.endsWith(ext));
  };
  
  const isVideoMessage = (msg) => {
    if(isAudioMessage(msg)) return false;
    if (msg.messageType === "video") return true;

    const fileName = msg.fileName?.toLowerCase() || "";

    return [
      ".mp4",
      ".webm",
      ".mov",
      ".avi",
      ".mkv",
    ].some((ext) => fileName.endsWith(ext));
  };


  const isLocationMessage = (msg) =>
    msg.messageType === "location";

  const getFileUrl = (msg) =>
    `${API_BASE_URL}${msg.fileUrl}`;

  const getMessageTime = (msg) =>
    new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getMessageReadCount = (msg) =>
    getReadRecipients(msg).filter(
      (member) => getId(member) !== currentUserId
    ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Group not found</p>
          <button
            onClick={() => navigate("/")}
            className="text-green-600 font-semibold"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="relative z-[100] h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
        >
          <ArrowLeft size={21} />
        </button>

        <button
          type="button"
          onClick={() => navigate(`/group/${groupId}/info`)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
            {group.groupImage ? (
              <img
                src={`${API_BASE_URL}${group.groupImage}`}
                alt={group.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <Users size={20} className="text-green-600" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {group.name}
            </h2>
            <p className="text-xs text-gray-500">
              {group.members?.length || 0} members
            </p>
          </div>
        </button>

        <div className="relative z-[200] shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGroupMenu((prev) => !prev);
            }}
            className="relative z-[201] w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
            title="Group options"
          >
            <MoreVertical size={21} />
          </button>

          {showGroupMenu && (
            <div className="absolute right-0 top-12 z-[9999] w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGroupMenu(false);
                  setShowClearChatModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition"
              >
                <Trash size={18} />
                <span>Clear chat</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MESSAGES */}
      <div className="relative flex-1 overflow-hidden">
        {loadingOlderMessages && (
          <div className="absolute top-2 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <span className="bg-white shadow-sm border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500">
              Loading older messages...
            </span>
          </div>
        )}

        <main
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4"
        >
          {error && (
            <p className="text-center text-red-500 text-sm mb-3">
              {error}
            </p>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div
              ref={setMessagesContentRef}
              className="space-y-3 max-w-6xl mx-auto w-full"
            >
              <div ref={topSentinelRef} style={{ height: 1 }} />

              {messages.map((msg) => {
                const messageSenderId = getId(msg.sender);
                const isMine = messageSenderId === currentUserId;

                const imageMessage = isImageMessage(msg);
                const videoMessage = isVideoMessage(msg);
                const audioMessage = isAudioMessage(msg);
                const locationMessage = isLocationMessage(msg);

                const senderName = msg.sender?.name || "Unknown";
                const messageRead = hasOtherReaders(msg);
                const readCount = getMessageReadCount(msg);

                const nonBubbleMessage =
                  imageMessage ||
                  videoMessage ||
                  locationMessage ||
                  audioMessage;

                return (
                  <div
                    key={msg._id}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`group flex flex-col gap-1 max-w-xs md:max-w-md ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      {!isMine && (
                        <span className="text-xs font-medium text-gray-500 px-1">
                          {senderName}
                        </span>
                      )}

                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity order-2">
                          {isMine && msg.messageType === "text" && (
                            <button
                              type="button"
                              onClick={() => startEditingMessage(msg)}
                              title="Edit message"
                              className="text-gray-400 hover:text-green-500 p-1"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg._id)}
                            title="Delete message"
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash size={16} />
                          </button>
                        </div>

                        <div
                          className={
                            nonBubbleMessage
                              ? "relative"
                              : `max-w-xs md:max-w-md px-3 py-2 rounded-2xl shadow-sm ${
                                  isMine
                                    ? "bg-green-500 text-white rounded-tr-none"
                                    : "bg-white text-gray-800 rounded-tl-none"
                                }`
                          }
                        >
                          {/* AUDIO */}
                          {audioMessage && msg.fileUrl && (
                            <AudioPlayer
                              src={getFileUrl(msg)}
                              isMine={isMine}
                              isRead={messageRead}
                              isDelivered={
                                msg.isDelivered || messageRead
                              }
                              isPlayed={
                                getPlayedIds(msg).includes(
                                  currentUserId
                                )
                              }
                              messageId={msg._id}
                              time={getMessageTime(msg)}
                              onOpenReadRecipients={() =>
                                openReadRecipients(msg)
                              }
                            />
                          )}

                          {/* VIDEO */}
                          {videoMessage && msg.fileUrl && (
                            <div className="relative">
                              <video
                                src={getFileUrl(msg)}
                                controls
                                preload="metadata"
                                className="max-w-xs md:max-w-sm max-h-80 rounded-2xl bg-black"
                              />

                              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                  {getMessageTime(msg)}
                                </span>

                                {isMine && (
                                  <button
                                    type="button"
                                    onClick={() => openReadRecipients(msg)}
                                    className={`bg-black/50 text-xs px-1 rounded-full tracking-[-3px] ${
                                      messageRead
                                        ? "text-blue-400 font-bold"
                                        : "text-white"
                                    }`}
                                    title="Read recipients"
                                  >
                                    {msg.isDelivered || messageRead
                                      ? "✓✓"
                                      : "✓"}
                                  </button>
                                )}

                                {!isMine &&
                                  !downloadedMessageIds.has(msg._id) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadFile(
                                          msg.fileUrl,
                                          msg.fileName,
                                          msg._id
                                        )
                                      }
                                      title="Download video"
                                      className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* IMAGE */}
                          {imageMessage && msg.fileUrl && (
                            <div className="relative">
                              <img
                                src={getFileUrl(msg)}
                                alt={msg.fileName || "Image"}
                                className="max-w-xs md:max-w-sm max-h-80 rounded-2xl object-cover cursor-pointer"
                                onClick={() =>
                                  window.open(
                                    getFileUrl(msg),
                                    "_blank"
                                  )
                                }
                              />

                              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                  {getMessageTime(msg)}
                                </span>

                                {isMine && (
                                  <button
                                    type="button"
                                    onClick={() => openReadRecipients(msg)}
                                    className={`bg-black/50 text-xs px-1 rounded-full tracking-[-3px] ${
                                      messageRead
                                        ? "text-blue-400 font-bold"
                                        : "text-white"
                                    }`}
                                    title="Read recipients"
                                  >
                                    {msg.isDelivered || messageRead
                                      ? "✓✓"
                                      : "✓"}
                                  </button>
                                )}

                                {!isMine &&
                                  !downloadedMessageIds.has(msg._id) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadFile(
                                          msg.fileUrl,
                                          msg.fileName,
                                          msg._id
                                        )
                                      }
                                      title="Download image"
                                      className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                              </div>
                            </div>
                          )}

                          {/* LOCATION */}
                          {locationMessage && msg.location && (
                            <LocationMap
                              latitude={msg.location.latitude}
                              longitude={msg.location.longitude}
                              isLive={msg.location.isLive}
                              expiresAt={msg.location.liveExpiresAt}
                              isMine={isMine}
                              onStopSharing={() =>
                                handleStopSharingLocation(msg._id)
                              }
                              time={getMessageTime(msg)}
                            />
                          )}

                          {/* FILE */}
                          {!imageMessage &&
                            !videoMessage &&
                            !audioMessage &&
                            !locationMessage &&
                            msg.messageType === "file" &&
                            msg.fileUrl && (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                  <FileText size={20} />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">
                                    {msg.fileName || "File"}
                                  </p>

                                  {msg.fileSize && (
                                    <p
                                      className={`text-xs ${
                                        isMine
                                          ? "text-green-100"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {(msg.fileSize / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>

                                {!isMine &&
                                  (downloadedMessageIds.has(msg._id) ? (
                                    <span className="text-xs text-gray-400 shrink-0">
                                      Downloaded
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        downloadFile(
                                          msg.fileUrl,
                                          msg.fileName,
                                          msg._id
                                        )
                                      }
                                      title="Download file"
                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 hover:bg-gray-300"
                                    >
                                      <Download size={18} />
                                    </button>
                                  ))}
                              </div>
                            )}

                          {/* TEXT */}
                          {msg.messageType === "text" && msg.text && (
                            <p className="break-words">{msg.text}</p>
                          )}

                          {msg.messageType !== "text" &&
                            !audioMessage &&
                            msg.text && (
                              <p className="break-words mt-2">
                                {msg.text}
                              </p>
                            )}

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

                          {!nonBubbleMessage && (
                            <div
                              className={`text-xs mt-1 flex items-center justify-end gap-1 ${
                                isMine
                                  ? "text-green-100"
                                  : "text-gray-400"
                              }`}
                            >
                              <span>{getMessageTime(msg)}</span>

                              {isMine && (
                                <button
                                  type="button"
                                  onClick={() => openReadRecipients(msg)}
                                  className={`tracking-[-3px] hover:opacity-80 ${
                                    messageRead
                                      ? "text-blue-500 font-bold"
                                      : "text-green-100"
                                  }`}
                                  title="Read recipients"
                                >
                                  {msg.isDelivered || messageRead
                                    ? "✓✓"
                                    : "✓"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                      </div>

                      {isMine && readCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openReadRecipients(msg)}
                          className="self-end text-[10px] text-gray-400 hover:text-green-600 px-1"
                        >
                          Read by {readCount}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition z-20"
            title="Scroll to latest message"
          >
            <ChevronDown size={21} />
          </button>
        )}
      </div>

      {/* COMPOSER */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="max-w-3xl mx-auto">
          {selectedFile && (
            <div className="mb-2 bg-gray-100 rounded-xl p-3">
              {selectedFile.type.startsWith("image/") ? (
                <div className="relative w-fit">
                  {selectedFilePreview && (
                    <img
                      src={selectedFilePreview}
                      alt="Selected"
                      className="max-w-xs max-h-60 rounded-xl object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                    title="Remove photo"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : selectedFile.type.startsWith("video/") ? (
                <div className="relative w-fit">
                  {selectedFilePreview && (
                    <video
                      src={selectedFilePreview}
                      controls
                      className="max-w-xs max-h-60 rounded-xl bg-black"
                    />
                  )}

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                    title="Remove video"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText
                      size={18}
                      className="text-gray-500 shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {isRecordingAudio ? (
              <div className="flex items-center gap-3 flex-1 bg-red-50 rounded-xl px-4 h-12 border border-red-100">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />

                <span className="text-red-600 font-medium min-w-[42px]">
                  {formatAudioRecordingTime(audioRecordingSeconds)}
                </span>

                <span className="text-gray-500 text-sm truncate">
                  Recording voice message...
                </span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <button 
                     type="button"
                     onClick={cancelAudioRecording}
                     className="text-gray-500 hover:text-red-500"
                     title="Cancel recording"
                  >
                    <X size={20} />
                  </button>
                  <button 
                     type="button"
                     onClick={stopAudioRecording}
                     className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600"
                     title="Send voice message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowEmojiPicker((prev) => !prev)
                    }
                    className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition"
                    title="Emoji"
                  >
                    😊
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-[2000]">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={320}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAttachMenu((prev) => !prev)
                    }
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                      showAttachMenu
                        ? "bg-gray-200 text-gray-800"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Attach"
                  >
                    <Paperclip size={20} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.avi,.mkv"
                  />

                  <input
                    ref={documentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                  />

                  {showAttachMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-[1900]"
                        onClick={() => setShowAttachMenu(false)}
                      />

                      <div className="absolute bottom-14 left-0 z-[2000] w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <ImageIcon size={18} className="text-gray-500" />
                          Photo &amp; video
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            openCamera("photo");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Camera size={18} className="text-gray-500" />
                          Take photo
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            openCamera("video");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Video size={18} className="text-gray-500" />
                          Record video
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            documentInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <FileText size={18} className="text-gray-500" />
                          Document
                        </button>

                        <button
                          type="button"
                          onClick={handleSendLocation}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <MapPin size={18} className="text-gray-500" />
                          Location
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    editingMessageId
                      ? "Edit your message..."
                      : "Type a message..."
                  }
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                />

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
                ) : message.trim() || selectedFile ? (
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send"
                  >
                    <Send size={20} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    disabled={sending}
                    className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Record voice message"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* LOCATION MODALS */}
      {showShareLocationModal && (
        <ShareLocationModal
          onSelect={sendLocationWithOptions}
          onClose={() => setShowShareLocationModal(false)}
        />
      )}

      {locationPreview && (
        <LocationPreviewModal
          latitude={locationPreview.latitude}
          longitude={locationPreview.longitude}
          isLive={locationPreview.isLive}
          durationMinutes={locationPreview.durationMinutes}
          onConfirm={confirmSendLocation}
          onCancel={cancelLocationPreview}
          sending={sendingLocation}
        />
      )}

      {/* READ RECIPIENTS */}
      {showReadRecipientsModal && readRecipientsMessage && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 px-4"
          onClick={closeReadRecipients}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Read by
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {getMessageReadCount(readRecipientsMessage)} of {Math.max((group.members?.length || 1) - 1, 0)} members
                </p>
              </div>

              <button
                type="button"
                onClick={closeReadRecipients}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3">
              {getReadRecipients(readRecipientsMessage)
                .filter((member) => getId(member) !== currentUserId)
                .map((member) => (
                  <div
                    key={getId(member)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden flex items-center justify-center shrink-0">
                      {member.profileImage ? (
                        <img
                          src={`${API_BASE_URL}${member.profileImage}`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={18} className="text-green-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name || member.username || "Member"}
                      </p>
                      {member.username && (
                        <p className="text-xs text-gray-500 truncate">
                          @{member.username}
                        </p>
                      )}
                    </div>

                    <Check size={17} className="text-blue-500 shrink-0" />
                  </div>
                ))}

              {getMessageReadCount(readRecipientsMessage) === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">
                    No group member has read this message yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MESSAGE */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-4"
          onClick={handleDeleteCancel}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete message
            </h3>

            <div className="space-y-2">
              {(() => {
                const selectedMessage = messages.find(
                  (m) => m._id === deleteMessageId
                );

                if (!selectedMessage) return null;

                const messageSenderId = getId(selectedMessage.sender);
                const isMine = messageSenderId === currentUserId;

                return (
                  <>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm("everyone")}
                        className="w-full rounded-xl px-4 py-3 text-left text-red-600 font-medium hover:bg-red-50 transition"
                      >
                        Delete for everyone
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteConfirm("me")}
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

      {/* CLEAR CHAT */}
      {showClearChatModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!clearingChat) setShowClearChatModal(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clear chat?
            </h3>

            <p className="text-sm text-gray-500 mb-5">
              This will clear all messages from this chat for you. Other group members will still see their messages.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleClearChat}
                disabled={clearingChat}
                className="w-full rounded-xl px-4 py-3 text-left text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50"
              >
                {clearingChat ? "Clearing chat..." : "Clear chat"}
              </button>

              <button
                type="button"
                onClick={() => setShowClearChatModal(false)}
                disabled={clearingChat}
                className="w-full rounded-xl px-4 py-3 text-left text-gray-500 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA */}
      {showCamera && (
        <div className="fixed inset-0 z-[3000] bg-black">
          <div className="relative w-full h-full bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-20 px-5 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
              <div>
                <h2 className="text-white text-lg font-semibold">
                  {cameraMode === "video"
                    ? "Record Video"
                    : "Take Photo"}
                </h2>

                <p className="text-white/70 text-xs mt-1">
                  {cameraMode === "video"
                    ? isRecording
                      ? "Recording..."
                      : "Tap the button to start recording"
                    : "Position yourself and capture a photo"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {cameraMode === "video" && isRecording && (
                  <span className="flex items-center gap-2 bg-red-600/90 text-white text-sm font-medium px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {formatRecordingTime(recordingSeconds)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={closeCamera}
                  className="w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                  title="Close camera"
                >
                  <X size={23} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center pb-10 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              {cameraMode === "video" ? (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-20 h-20 rounded-full bg-white border-[5px] border-white/50 shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center"
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <span className="w-8 h-8 rounded-md bg-red-600" />
                  ) : (
                    <span className="w-16 h-16 rounded-full bg-red-600 border border-red-700" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-[5px] border-white/50 shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center"
                  title="Capture photo"
                >
                  <span className="w-16 h-16 rounded-full bg-white border border-gray-300" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupChat;
