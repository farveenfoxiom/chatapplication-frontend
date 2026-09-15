import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
  loading: false,
  error: "",
};

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    messageReceived: (state, action) => {
      const newMessage = action.payload;
      const alreadyExists = state.messages.some(
        (msg) => msg._id === newMessage._id
      );
      if (alreadyExists) return;
      state.messages.push(newMessage);
      state.messages.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    },
    messageReplaced: (state, action) => {
      const updatedMessage = action.payload;
      const index = state.messages.findIndex(
        (msg) => msg._id === updatedMessage._id
      );
      if (index !== -1) {
        state.messages[index] = updatedMessage;
      }
    },
    updateMessage: (state, action) => {
      const { messageId, updates } = action.payload;
      const messageIndex = state.messages.findIndex(
        (message) => message._id.toString() === messageId.toString()
      );
      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...updates,
        };
      }
    },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter(
        (message) => message._id.toString() !== action.payload.toString()
      );
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  setMessages,
  addMessage,
  messageReceived,
  messageReplaced,
  updateMessage,
  removeMessage,
  setLoading,
  setError,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;