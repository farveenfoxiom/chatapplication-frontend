import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  User,
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
  MapPin,
  Mic
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  getMessages,
  sendMessage,
  sendLocationMessage,
  deleteMessage,
  markMessagesAsRead,
  editMessage,
} from "../services/messageService";
import { getUserById } from "../services/userService";
import socket from "../socket/socket";
import {
  setMessages,
  addMessage,
  messageReceived,
  messageReplaced,
  updateMessage,
  removeMessage,
  setLoading,
  setError,
} from "../redux/slices/messageSlice";
import LocationMap from "../components/LocationMap";
import ShareLocationModal from "../components/ShareLocationModal";
import LocationPreviewModal from "../components/LocationPreviewModal";

import {
  setUserOnline,
  setUserOffline,
  setUserStatus,
} from "../redux/slices/presenceSlice";

import { API_BASE_URL, SOCKET_URL } from "../config"; 

import { getImageUrl } from "../utils/getImageUrl";
const AudioPlayer = ({
  src,
  isMine,
  isRead,
  isDelivered,
  time,
  isPlayed,
  messageId,
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

      // Trigger socket event ONLY if current user is receiving an unplayed voice message
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
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleProgressChange = (e) => {
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
  const heights = [10, 18, 12, 26, 14, 22, 8, 16, 20, 12, 24, 10, 16, 22, 14, 20, 12, 18, 24];

  return (
    <div
      className={`relative flex items-center gap-3 w-72 max-w-full p-3 rounded-2xl ${
        isMine
          ? "bg-green-500 text-white rounded-br-none"
          : "bg-white text-gray-800 rounded-bl-none shadow-sm"
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
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isMine
              ? played
                ? "bg-blue-100 text-blue-500"
                : "bg-white/20 text-white"
              : played
              ? "bg-blue-100 text-blue-500"
              : "bg-green-100 text-green-600"
          }`}
        >
          <Mic size={20} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
              isMine
                ? "bg-white text-green-600 hover:bg-white/90"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {isPlaying ? (
              <span className="text-xs font-bold leading-none">❚❚</span>
            ) : (
              <span className="text-xs font-bold leading-none ml-0.5">▶</span>
            )}
          </button>

          <div className="relative flex-1 flex items-center gap-[2px] h-7">
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
                      ? isMine
                        ? "bg-white"
                        : "bg-green-500"
                      : isMine
                      ? "bg-white/40"
                      : "bg-gray-300"
                  }`}
                />
              );
            })}

            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleProgressChange}
              aria-label="Audio progress"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] mt-1 font-medium">
          <span className={isMine ? "text-white/80" : "text-gray-500"}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>

          <div
            className={`flex items-center gap-1 ${
              isMine ? "text-white/80" : "text-gray-400"
            }`}
          >
            <span>{time}</span>
            {isMine && (
              <span
                className={
                  played || isRead ? "text-blue-500 font-bold" : "text-white/80"
                }
              >
                {isDelivered || played ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { token, user: currentUser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { messages, loading, error } = useSelector((state) => state.message);

  const [chatUser, setChatUser] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [downloadedMessageIds, setDownloadedMessageIds] = useState(new Set());
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
  const audioStreamRef = useRef(null);
  const audioMediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioTimerRef = useRef(null);
  const audioDiscardedRef = useRef(false);

  const [showShareLocationModal, setShowShareLocationModal] = useState(false);
  const [locationPreview, setLocationPreview] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);

  const liveLocationWatchIdRef = useRef(null);
  const liveLocationMessageIdRef = useRef(null);
  const liveLocationTimeoutRef = useRef(null);
  

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [sending, setSending] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesContentRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  const addedMessageIdsRef = useRef(new Set());

  const registerMessageId = (id) => {
    if (!id) return false;
    if (addedMessageIdsRef.current.has(id)) return false;
    addedMessageIdsRef.current.add(id);
    return true;
  };

  const isOnline = useSelector(
    (state) => state.presence.onlineUsers[userId?.toString()] || false
  );

  const lastSeen = useSelector(
    (state) => state.presence.lastSeen[userId?.toString()] || null
  );

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
      !userId ||
      !token ||
      !hasMoreMessages ||
      isLoadingOlderMessagesRef.current ||
      messages.length === 0
    ) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

    const oldestMessage = messages[0];
    if (!oldestMessage?.createdAt) return;

    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;

    isLoadingOlderMessagesRef.current = true;
    setLoadingOlderMessages(true);

    try {
      const messageData = await getMessages(
        userId,
        token,
        20,
        oldestMessage.createdAt
      );

      const olderMessages = messageData.messages || [];

      if (olderMessages.length > 0) {
        isNearBottomRef.current = false;
        olderMessages.forEach((m) => {
          if (m?._id) addedMessageIdsRef.current.add(m._id);
        });

        dispatch(setMessages([...olderMessages, ...messages]));

        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop =
            newScrollHeight - oldScrollHeight + oldScrollTop;
        });
      }

      setHasMoreMessages(messageData.hasMore ?? false);
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [userId, token, hasMoreMessages, messages, dispatch]);

  const handleScroll = async (e) => {
    const container = e.target;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 100;

    isNearBottomRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);

    if (
      scrollTop <= 100 &&
      hasMoreMessages &&
      !isLoadingOlderMessagesRef.current &&
      messages.length > 0
    ) {
      await loadOlderMessages();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchChat = async () => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(""));

        isInitialLoadRef.current = true;
        isNearBottomRef.current = true;
        isLoadingOlderMessagesRef.current = false;
        addedMessageIdsRef.current = new Set();

        setShowScrollButton(false);
        setHasMoreMessages(true);

        const userData = await getUserById(userId, token);
        if (!isMounted) return;

        setChatUser(userData.user);

        const messageData = await getMessages(userId, token, 20);
        if (!isMounted) return;

        const initialMessages = messageData.messages || [];
        dispatch(setMessages(initialMessages));

        addedMessageIdsRef.current = new Set(
          initialMessages.map((m) => m._id).filter(Boolean)
        );

        setHasMoreMessages(messageData.hasMore ?? false);

        try {
          await markMessagesAsRead(userId, token);
        } catch (readError) {
          console.error("Mark messages as read error:", readError);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load chat:", error);
        dispatch(
          setError(error.response?.data?.message || "Failed to load chat")
        );
      } finally {
        if (isMounted) dispatch(setLoading(false));
      }
    };

    if (userId && token) {
      fetchChat();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, token, dispatch]);

  useEffect(() => {
    if (!userId) return;

    const handleOnlineStatus = (data) => {
      if (data.userId?.toString() === userId.toString()) {
        dispatch(
          setUserStatus({
            userId,
            isOnline: data.isOnline,
            lastSeen: data.lastSeen,
          })
        );
      }
    };

    const handleUserOnline = (data) => {
      if (data.userId?.toString() === userId.toString()) {
        dispatch(setUserOnline(userId));
      }
    };

    const handleUserOffline = (data) => {
      if (data.userId?.toString() === userId.toString()) {
        dispatch(setUserOffline({ userId, lastSeen: data.lastSeen }));
      }
    };

    const checkOnlineStatus = () => {
      socket.emit("check_user_online", userId);
    };

    socket.on("user_online_status", handleOnlineStatus);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);

    if (socket.connected) {
      checkOnlineStatus();
    } else {
      socket.once("connect", checkOnlineStatus);
    }

    return () => {
      socket.off("user_online_status", handleOnlineStatus);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("connect", checkOnlineStatus);
    };
  }, [userId, dispatch]);

  useEffect(() => {
    const handleNewMessage = async (data) => {
      const newMessage = data?.message;
      if (!newMessage) return;

      const messageSenderId =
        newMessage.sender?._id?.toString() || newMessage.sender?.toString();

      const messageReceiverId =
        newMessage.receiver?._id?.toString() || newMessage.receiver?.toString();

      const currentUserId =
        currentUser?._id?.toString() || currentUser?.id?.toString();

      if (!currentUserId || !userId) return;

      const isForThisChat =
        (messageSenderId === userId.toString() &&
          messageReceiverId === currentUserId) ||
        (messageSenderId === currentUserId &&
          messageReceiverId === userId.toString());

      if (!isForThisChat) return;

      if (registerMessageId(newMessage._id)) {
        dispatch(messageReceived(newMessage));
      }

      try {
        await markMessagesAsRead(userId, token);
      } catch (error) {
        console.error("Failed to mark realtime message as read:", error);
      }
    };

    const handleMessageEdited = (data) => {
      const updatedMessage = data?.message;
      if (!updatedMessage) return;
      dispatch(messageReplaced(updatedMessage));
    };

    const handleMessageDeleted = (data) => {
      const messageId = data?.messageId;
      if (!messageId) return;
      dispatch(removeMessage(messageId));
    };

    const handleAudioMarkedPlayed = (data) => {
      const { messageId } = data;
      if (!messageId) return;

      dispatch(
        updateMessage({
          messageId,
          updates: { isPlayed: true, isRead: true , isDelivered : true },
        })
      );
    };

    const handleLocationUpdate = (data) => {
      const { messageId, latitude , longitude , lastUpdatedAt} = data || {};
      if(!messageId) return;
      
      const existing = messages.find(
        (m) => m._id?.toString() === messageId.toString()
      );

      if (!existing) return;

      dispatch(
        updateMessage({
          messageId,
          updates : {
            location : { ...existing.location,latitude, longitude, lastUpdatedAt,},
          },
        })
      );
    };

    const handleLocationShareStopped = (data) => {
      const { messageId } = data || {};
      if(!messageId) return;
      const existing = messages.find(
        (m) => m._id?.toString() === messageId.toString()
      );

      if (!existing) return;
      dispatch(
        updateMessage({
          messageId,
          updates: {
            location: {...existing.location ,isLive : false},
          },
        })
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("audio_marked_played", handleAudioMarkedPlayed);
    socket.on("location_update", handleLocationUpdate);
    socket.on("location_share_stopped", handleLocationShareStopped);
    
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("audio_marked_played", handleAudioMarkedPlayed);
      socket.off("location_update", handleLocationUpdate);
      socket.off("location_share_stopped", handleLocationShareStopped);
      
    };
  }, [userId, currentUser, token, dispatch , messages]);

  useEffect(() => {
    if (!userId || !currentUser) return;

    const currentUserId =
      currentUser?._id?.toString() || currentUser?.id?.toString();

    const handleMessagesRead = (data) => {
      if (data.userId?.toString() !== userId.toString()) return;

      messages.forEach((message) => {
        const senderId =
          message.sender?._id?.toString() || message.sender?.toString();

        const receiverId =
          message.receiver?._id?.toString() || message.receiver?.toString();

        if (senderId === currentUserId && receiverId === userId.toString()) {
          dispatch(
            updateMessage({
              messageId: message._id,
              updates: { isRead: true },
            })
          );
        }
      });
    };

    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [userId, currentUser, messages, dispatch]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    isNearBottomRef.current = true;
  }, [userId]);

  useEffect(() => {
    if (!messages.length) setShowScrollButton(false);
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

      if (isNearBottomRef.current) {
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      dispatch(
        setError(
          isVideo
            ? "Video must be less than 50 MB"
            : "File size must be less than 5 MB"
        )
      );
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    dispatch(setError(""));
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

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
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
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera.");
    }
  };

  useEffect(() => {
    if (!showCamera) return;

    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play().catch((error) => console.error("Video play error:", error));
    };
  }, [showCamera]);

  const closeCamera = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
    if (!stream) return;

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
      }

      const chunks = recordedChunksRef.current;
      recordedChunksRef.current = [];
      if (!chunks.length) return;

      const baseType = (mimeType || "video/webm").split(";")[0].trim();
      const blob = new Blob(chunks, { type: baseType });
      const extension = baseType.includes("mp4") ? "mp4" : "webm";

      const file = new File([blob], `video-${Date.now()}.${extension}`, {
        type: baseType,
      });

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    closeCamera();
  };

  const formatRecordingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelectedFile(file);
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleSendMessage = async () => {
    const text = message.trim();
    if ((!text && !selectedFile) || sending) return;

    try {
      setSending(true);
      const data = await sendMessage(userId, text, token, selectedFile);

      if (registerMessageId(data.message._id)) {
        dispatch(addMessage(data.message));
      }

      isNearBottomRef.current = true;
      setMessage("");
      setSelectedFile(null);
      setSelectedFilePreview(null);
      dispatch(setError(""));
    } catch (error) {
      console.error("Send message error:", error);
      dispatch(
        setError(error.response?.data?.message || "Failed to send message")
      );
    } finally {
      setSending(false);
    }
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

  const sendAudioMessage = async (file) => {
    try {
      setSending(true);
      const data = await sendMessage(userId, "", token, file);

      if (registerMessageId(data.message._id)) {
        dispatch(addMessage(data.message));
      }

      isNearBottomRef.current = true;
      dispatch(setError(""));
    } catch (error) {
      console.error("Send audio error:", error);
      dispatch(
        setError(
          error.response?.data?.message || "Failed to send voice message"
        )
      );
    } finally {
      setSending(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      audioDiscardedRef.current = false;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }

        if (audioTimerRef.current) {
          clearInterval(audioTimerRef.current);
        }

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        setIsRecordingAudio(false);
        setAudioRecordingSeconds(0);

        if (audioDiscardedRef.current || !chunks.length) return;

        const baseType = (mimeType || "audio/webm").split(";")[0].trim();
        const blob = new Blob(chunks, { type: baseType });
        const extension = baseType.includes("ogg")
          ? "ogg"
          : baseType.includes("mp4")
          ? "m4a"
          : "webm";

        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: baseType,
        });

        sendAudioMessage(file);
      };

      recorder.start();
      audioMediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioRecordingSeconds(0);

      audioTimerRef.current = setInterval(() => {
        setAudioRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Audio recording error:", error);
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
    if (audioMediaRecorderRef.current?.state !== "inactive") {
      audioMediaRecorderRef.current.stop();
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
      (err) => {
        console.error("watchPosition error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
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

      const data = await sendLocationMessage(
        userId,
        latitude,
        longitude,
        token,
        isLive,
        durationMinutes
      );

      if (registerMessageId(data.message._id)) {
        dispatch(addMessage(data.message));
      }

      isNearBottomRef.current = true;
      setLocationPreview(null);
      dispatch(setError(""));

      if (isLive) {
        startLiveLocationTracking(data.message._id, durationMinutes);
      }

      setLocationPreview(null);
      dispatch(setError(""));
    } catch (error) {
      console.error("Send location error:", error);
      dispatch(
        setError(
          error.response?.data?.message || "Failed to send location"
        )
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
    return () => {
      stopLiveLocationTracking();
    };
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
      if (deleteFor === "me") {
        dispatch(removeMessage(deleteMessageId));
      }
      setDeleteMessageId(null);
      setShowDeleteModal(false);
      dispatch(setError(""));
    } catch (error) {
      console.error("Delete message error:", error);
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
      const data = await editMessage(editingMessageId, text, token);
      dispatch(messageReplaced(data.updatedMessage));
      setMessage("");
      setEditingMessageId(null);
      dispatch(setError(""));
    } catch (error) {
      console.error("Edit message error:", error);
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
      const response = await fetch(
        fileUrl.startsWith("http")? fileUrl : `${API_BASE_URL}${fileUrl}`
      );
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
        setDownloadedMessageIds((prev) => new Set(prev).add(messageId));
      }
    } catch (error) {
      console.error("File download error:", error);
    }
  };

  // Strictly mutually exclusive type checkers
  const isAudioMessage = (msg) => {
    if (msg.messageType === "audio") return true;
    const fileName = msg.fileName?.toLowerCase() || "";
    return [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"].some((ext) =>
      fileName.endsWith(ext)
    ) && msg.messageType !== "video";
  };

  const isVideoMessage = (msg) => {
    if (isAudioMessage(msg)) return false;
    if (msg.messageType === "video") return true;
    const fileName = msg.fileName?.toLowerCase() || "";
    return [".mp4", ".mov", ".avi", ".mkv"].some((ext) => fileName.endsWith(ext));
  };

  const isImageMessage = (msg) => {
    if (msg.messageType === "image") return true;
    const fileName = msg.fileName?.toLowerCase() || "";
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) =>
      fileName.endsWith(ext)
    );
  };

  const isLocationMessage = (msg) => msg.messageType === "location";

  const getFileUrl = (msg) => {
    if (!msg.fileUrl) return "";
    if (!msg.fileUrl.startsWith("http")) return msg.fileUrl;
    return `${API_BASE_URL}${msg.fileUrl}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  if (!chatUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">User not found</p>
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
      <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
        >
          <ArrowLeft size={21} />
        </button>

        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
          {chatUser.profileImage ? (
            <img
              src={getImageUrl(chatUser.profileImage)}
              alt={chatUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User size={20} className="text-green-600" />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-gray-900">{chatUser.name}</h2>
          <p
            className={`text-xs ${
              isOnline ? "text-green-500" : "text-gray-500"
            }`}
          >
            {isOnline
              ? "Online"
              : lastSeen
              ? `Last seen ${new Date(lastSeen).toLocaleString([], {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Offline"}
          </p>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <main
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4"
        >
          {error && (
            <p className="text-center text-red-500 text-sm mb-3">{error}</p>
          )}

          {loadingOlderMessages && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-gray-400">
                Loading older messages...
              </span>
            </div>
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
              {messages.map((msg) => {
                const messageSenderId =
                  msg.sender?._id?.toString() || msg.sender?.toString();

                const currentUserId =
                  currentUser?._id?.toString() || currentUser?.id?.toString();

                const isMine = messageSenderId === currentUserId;

                const audioMessage = isAudioMessage(msg);
                const videoMessage = isVideoMessage(msg);
                const imageMessage = isImageMessage(msg);
                const locationMessage = isLocationMessage(msg);

                return (
                  <div
                    key={msg._id}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="group flex items-end gap-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        className={`${
                          imageMessage ||
                          videoMessage ||
                          locationMessage ||
                          audioMessage
                            ? "relative"
                            : `max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                                isMine
                                  ? "bg-green-500 text-white rounded-br-md"
                                  : "bg-white text-gray-800 rounded-bl-md"
                              }`
                        }`}
                      >
                        {/* 1. AUDIO MESSAGE */}
                        {audioMessage && msg.fileUrl ? (
                          <AudioPlayer
                            src={getFileUrl(msg)}
                            isMine={isMine}
                            isRead={msg.isRead}
                            isDelivered={msg.isDelivered}
                            isPlayed={msg.isPlayed}
                            messageId={msg._id}
                            time={new Date(msg.createdAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          />
                        ) : videoMessage && msg.fileUrl ? (
                          /* 2. VIDEO MESSAGE */
                          <div className="relative">
                            <video
                              src={getFileUrl(msg)}
                              controls
                              preload="metadata"
                              className="max-w-xs md:max-w-sm max-h-80 rounded-2xl bg-black"
                            />

                            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                              {isMine && (
                                <span
                                  className={
                                    msg.isRead ? "text-blue-400" : "text-white"
                                  }
                                >
                                  {msg.isDelivered ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : imageMessage && msg.fileUrl ? (
                          /* 3. IMAGE MESSAGE */
                          <div className="relative">
                            <img
                              src={getFileUrl(msg)}
                              alt={msg.fileName || "Image"}
                              className="max-w-xs md:max-w-sm max-h-80 rounded-2xl object-cover cursor-pointer"
                              onClick={() =>
                                window.open(getFileUrl(msg), "_blank")
                              }
                            />

                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                              {isMine && (
                                <span
                                  className={
                                    msg.isRead ? "text-blue-400" : "text-white"
                                  }
                                >
                                  {msg.isDelivered ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : locationMessage && msg.location ? (
                          /* 4. LOCATION MESSAGE */
                          <LocationMap
                            latitude={msg.location.latitude}
                            longitude={msg.location.longitude}
                            isLive={msg.location.isLive}
                            expiresAt={msg.location.liveExpiresAt}
                            isMine={isMine}
                            onStopSharing={()=> handleStopSharingLocation(msg._id)}
                            time={new Date(msg.createdAt).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          />
                        ) : msg.messageType === "file" && msg.fileUrl ? (
                          /* 5. GENERIC FILE / DOCUMENT */
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
                                    isMine ? "text-green-100" : "text-gray-500"
                                  }`}
                                >
                                  {(msg.fileSize / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>

                            {!isMine && (
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
                            )}
                          </div>
                        ) : null}

                        {/* TEXT CONTENT */}
                        {msg.text && (
                          <p
                            className={`break-words ${
                              audioMessage ||
                              videoMessage ||
                              imageMessage ||
                              locationMessage
                                ? "p-2"
                                : ""
                            }`}
                          >
                            {msg.text}
                          </p>
                        )}

                        {msg.isEdited && (
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? "text-green-100" : "text-gray-400"
                            }`}
                          >
                            Edited
                          </p>
                        )}

                        {/* TEXT/FILE FOOTER TIMESTAMPS */}
                        {!imageMessage &&
                          !videoMessage &&
                          !locationMessage &&
                          !audioMessage && (
                            <div
                              className={`text-xs mt-1 flex items-center justify-end gap-1 ${
                                isMine ? "text-green-100" : "text-gray-400"
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>

                              {isMine && (
                                <span
                                  className={`${
                                    msg.isRead
                                      ? "text-blue-500"
                                      : "text-green-100"
                                  } tracking-[-3px]`}
                                >
                                  {msg.isDelivered ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          )}
                      </div>
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
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="text-gray-500 shrink-0" />
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

          {isRecordingAudio && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardAudioRecording}
                className="w-12 h-12 rounded-xl bg-gray-100 text-red-500 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <Trash size={20} />
              </button>

              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-gray-700 font-medium">
                  {formatRecordingTime(audioRecordingSeconds)}
                </span>
                <span className="text-sm text-gray-400">
                  Recording voice message...
                </span>
              </div>

              <button
                type="button"
                onClick={confirmAudioRecording}
                className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition"
              >
                <Send size={20} />
              </button>
            </div>
          )}

          {!isRecordingAudio && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition"
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
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                    showAttachMenu
                      ? "bg-gray-200 text-gray-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
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
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAttachMenu(false)}
                    />

                    <div className="absolute bottom-14 left-0 z-50 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
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
                  >
                    <X size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={handleEditMessage}
                    disabled={!message.trim()}
                    className="px-4 h-12 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition disabled:opacity-50"
                  >
                    Update
                  </button>
                </>
              ) : message.trim() || selectedFile ? (
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition"
                >
                  <Mic size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
                  (msg) => msg._id === deleteMessageId
                );

                if (!selectedMessage) return null;

                const messageSenderId =
                  selectedMessage.sender?._id?.toString() ||
                  selectedMessage.sender?.toString();

                const currentUserId =
                  currentUser?._id?.toString() ||
                  currentUser?.id?.toString();

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

      {showCamera && (
        <div className="fixed inset-0 z-[3000] bg-black">
          <div className="relative w-full h-full bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-20 px-5 py-5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
              <div>
                <h2 className="text-white text-lg font-semibold">
                  {cameraMode === "video" ? "Record Video" : "Take Photo"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCamera}
                className="w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
              >
                <X size={23} />
              </button>
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
                  className="w-20 h-20 rounded-full bg-white border-[5px] border-white/50 shadow-xl flex items-center justify-center"
                >
                  {isRecording ? (
                    <span className="w-8 h-8 rounded-md bg-red-600" />
                  ) : (
                    <span className="w-16 h-16 rounded-full bg-red-600" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-[5px] border-white/50 shadow-xl flex items-center justify-center"
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

export default Chat;