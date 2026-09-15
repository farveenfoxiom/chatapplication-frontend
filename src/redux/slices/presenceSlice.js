import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  onlineUsers: {},
  lastSeen: {},
};

const presenceSlice = createSlice({
  name: "presence",
  initialState,
  reducers: {
    setUserOnline: (state, action) => {
      const userId = action.payload.toString();
      state.onlineUsers[userId] = true;
    },

    setUserOffline: (state, action) => {
      const { userId, lastSeen } = action.payload;
      const id = userId.toString();

      state.onlineUsers[id] = false;
      state.lastSeen[id] = lastSeen;
    },

    setUserStatus: (state, action) => {
      const { userId, isOnline, lastSeen } = action.payload;
      const id = userId.toString();

      state.onlineUsers[id] = isOnline;

      if (lastSeen) {
        state.lastSeen[id] = lastSeen;
      }
    },

    setUserLastSeen: (state, action) => {
      const { userId, lastSeen } = action.payload;
      state.lastSeen[userId.toString()] = lastSeen;
    },
  },
});

export const {
  setUserOnline,
  setUserOffline,
  setUserStatus,
  setUserLastSeen,
} = presenceSlice.actions;

export default presenceSlice.reducer;