import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  chats: [],
  loading: false,
  error: "",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChats: (state, action) => {
      state.chats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    chatBumpedToTop: (state, action) => {
      const { userId, updates, incrementUnread } = action.payload;

      const chatIndex = state.chats.findIndex(
        (chat) => chat.user._id.toString() === userId.toString()
      );

      if (chatIndex === -1) return;

      const existingChat = state.chats[chatIndex];

      const updatedChat = {
        ...existingChat,
        ...updates,
        unreadCount: incrementUnread
          ? (existingChat.unreadCount || 0) + 1
          : existingChat.unreadCount || 0,
      };

      state.chats.splice(chatIndex, 1);
      state.chats.unshift(updatedChat);
    },
    addChat: (state, action) => {
      state.chats.unshift(action.payload);
    },
    updateChat: (state, action) => {
      const { userId, updates } = action.payload;
      const chatIndex = state.chats.findIndex(
        (chat) => chat.user._id.toString() === userId.toString()
      );
      if (chatIndex !== -1) {
        state.chats[chatIndex] = {
          ...state.chats[chatIndex],
          ...updates,
        };
      }
    },
    removeChat: (state, action) => {
      state.chats = state.chats.filter(
        (chat) => chat.user._id.toString() !== action.payload.toString()
      );
    },
  },
});

export const {
  setChats,
  setLoading,
  setError,
  chatBumpedToTop,
  updateChat,
  removeChat,
  addChat
} = chatSlice.actions;

export default chatSlice.reducer;