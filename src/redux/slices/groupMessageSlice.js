import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  loading: false,
  error: "",
  hasMoreMessages: true,
  loadingOlderMessages: false,
};

// Works for populated objects ({ _id }), { id }, and plain id strings/ObjectIds
const idOf = (value) =>
  value?._id?.toString() || value?.id?.toString() || value?.toString();

const sortByCreatedAt = (messages) =>
  messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

const groupMessageSlice = createSlice({
  name: "groupMessage",

  initialState,

  reducers: {
    // Replace the whole list (initial load, clear chat)
    setGroupMessages: (state, action) => {
      state.messages = action.payload;
    },

    // Add a message I just sent
    addGroupMessage: (state, action) => {
      const newMessage = action.payload;
      if (!newMessage) return;

      const alreadyExists = state.messages.some(
        (message) => idOf(message) === idOf(newMessage)
      );

      if (alreadyExists) return;

      state.messages.push(newMessage);
      sortByCreatedAt(state.messages);
    },

    // Add a message received through Socket.IO
    groupMessageReceived: (state, action) => {
      const newMessage = action.payload;
      if (!newMessage) return;

      const alreadyExists = state.messages.some(
        (message) => idOf(message) === idOf(newMessage)
      );

      if (alreadyExists) return;

      state.messages.push(newMessage);
      sortByCreatedAt(state.messages);
    },

    // Add older messages when scrolling upward
    prependGroupMessages: (state, action) => {
      const olderMessages = action.payload || [];

      const existingIds = new Set(
        state.messages.map((message) => idOf(message))
      );

      const uniqueOlderMessages = olderMessages.filter(
        (message) => !existingIds.has(idOf(message))
      );

      if (!uniqueOlderMessages.length) return;

      state.messages = [...uniqueOlderMessages, ...state.messages];
    },

    // Merge partial updates into one message
    updateGroupMessage: (state, action) => {
      const { messageId, updates } = action.payload;

      const messageIndex = state.messages.findIndex(
        (message) => idOf(message) === messageId?.toString()
      );

      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...updates,
        };
      }
    },

    // Replace one complete message object (edit)
    replaceGroupMessage: (state, action) => {
      const updatedMessage = action.payload;
      if (!updatedMessage) return;

      const messageIndex = state.messages.findIndex(
        (message) => idOf(message) === idOf(updatedMessage)
      );

      if (messageIndex !== -1) {
        state.messages[messageIndex] = updatedMessage;
      }
    },

    // Delete one message
    removeGroupMessage: (state, action) => {
      const messageId = action.payload?.toString();

      state.messages = state.messages.filter(
        (message) => idOf(message) !== messageId
      );
    },

    // Add one user to readBy of one message
    updateGroupMessageReadBy: (state, action) => {
      const { messageId, userId } = action.payload;

      const message = state.messages.find(
        (item) => idOf(item) === messageId?.toString()
      );

      if (!message || !userId) return;

      const existingReadIds = (message.readBy || []).map(idOf);

      if (!existingReadIds.includes(userId.toString())) {
        message.readBy = [...(message.readBy || []), userId.toString()];
      }
    },

    // Socket: group_messages_read
    // Someone opened the group, so add them to readBy of MY messages
    markGroupMessagesReadByUser: (state, action) => {
      const { userId, currentUserId } = action.payload;
      if (!userId || !currentUserId) return;

      state.messages.forEach((message) => {
        const senderId = idOf(message.sender);

        // only messages sent by me, and never count the reader as reading their own
        if (!senderId || senderId === userId || senderId !== currentUserId) {
          return;
        }

        const readIds = (message.readBy || []).map(idOf);

        if (!readIds.includes(userId)) {
          message.readBy = [...(message.readBy || []), userId];
        }
      });
    },

    // Socket: group_messages_delivered
    // A member's device received these messages (they came online / connected)
    markGroupMessagesDeliveredToUser: (state, action) => {
      const { userId, messageIds } = action.payload;
      if (!userId || !messageIds?.length) return;

      const ids = new Set(messageIds.map((id) => id.toString()));

      state.messages.forEach((message) => {
        if (!ids.has(idOf(message))) return;

        const deliveredIds = (message.deliveredTo || []).map(idOf);

        if (!deliveredIds.includes(userId)) {
          message.deliveredTo = [...(message.deliveredTo || []), userId];
        }
      });
    },

    // Socket: audio_marked_played
    // Playing a voice message also counts as reading it
    updateGroupMessagePlayedBy: (state, action) => {
      const { messageId, userId, playedBy, currentUserId } = action.payload;

      const message = state.messages.find(
        (item) => idOf(item) === messageId?.toString()
      );

      if (!message) return;

      const existingPlayedIds = (message.playedBy || []).map(idOf);

      if (playedBy?.length) {
        message.playedBy = playedBy.map(idOf).filter(Boolean);
      } else if (userId && !existingPlayedIds.includes(userId.toString())) {
        message.playedBy = [...(message.playedBy || []), userId.toString()];
      }

      if (userId) {
        const existingReadIds = (message.readBy || []).map(idOf);

        if (!existingReadIds.includes(userId.toString())) {
          message.readBy = [...(message.readBy || []), userId.toString()];
        }

        if (currentUserId && userId.toString() === currentUserId) {
          message.isPlayed = true;
        }
      }
    },

    // Socket: location_update (live location moved)
    updateGroupMessageLocation: (state, action) => {
      const { messageId, latitude, longitude, lastUpdatedAt } = action.payload;

      const message = state.messages.find(
        (item) => idOf(item) === messageId?.toString()
      );

      if (!message) return;

      message.location = {
        ...message.location,
        latitude,
        longitude,
        lastUpdatedAt,
      };
    },

    // Socket: location_share_stopped
    stopGroupMessageLocation: (state, action) => {
      const messageId = action.payload?.toString();

      const message = state.messages.find((item) => idOf(item) === messageId);

      if (!message) return;

      message.location = {
        ...message.location,
        isLive: false,
      };
    },

    // Remove every message
    clearGroupMessages: (state) => {
      state.messages = [];
    },

    // Loading state for the initial fetch
    setGroupMessagesLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Loading state when fetching older messages
    setLoadingOlderGroupMessages: (state, action) => {
      state.loadingOlderMessages = action.payload;
    },

    // Error state
    setGroupMessageError: (state, action) => {
      state.error = action.payload;
    },

    // Whether older messages are available
    setHasMoreGroupMessages: (state, action) => {
      state.hasMoreMessages = action.payload;
    },

    // Reset everything when opening another group / leaving the chat
    resetGroupMessageState: (state) => {
      state.messages = [];
      state.loading = false;
      state.error = "";
      state.hasMoreMessages = true;
      state.loadingOlderMessages = false;
    },
  },
});

export const {
  setGroupMessages,
  addGroupMessage,
  groupMessageReceived,
  prependGroupMessages,
  updateGroupMessage,
  replaceGroupMessage,
  removeGroupMessage,
  updateGroupMessageReadBy,
  markGroupMessagesReadByUser,
  markGroupMessagesDeliveredToUser,
  updateGroupMessagePlayedBy,
  updateGroupMessageLocation,
  stopGroupMessageLocation,
  clearGroupMessages,
  setGroupMessagesLoading,
  setLoadingOlderGroupMessages,
  setGroupMessageError,
  setHasMoreGroupMessages,
  resetGroupMessageState,
} = groupMessageSlice.actions;

export default groupMessageSlice.reducer;