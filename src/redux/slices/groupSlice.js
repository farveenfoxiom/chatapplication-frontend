import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  groups: [],
  loading: false,
  error: "",
};

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    setGroups: (state, action) => {
      const fetchedGroups = action.payload;

      state.groups = fetchedGroups.map((fetchedGroup) => {
        const existing = state.groups.find(
          (g) => g._id.toString() === fetchedGroup._id.toString()
        );

        if (!existing) {
          return fetchedGroup;
        }

        const existingTime = existing.lastMessageTime
          ? new Date(existing.lastMessageTime).getTime()
          : 0;

        const fetchedTime = fetchedGroup.lastMessageTime
          ? new Date(fetchedGroup.lastMessageTime).getTime()
          : 0;

        if (existingTime > fetchedTime) {
          return existing;
        }

        return fetchedGroup;
      });
    },

    addGroup: (state, action) => {
      const group = action.payload;

      const exists = state.groups.some(
        (item) => item._id.toString() === group._id.toString()
      );

      if (!exists) {
        state.groups.unshift({
          ...group,
          lastMessage: group.lastMessage || null,
          unreadCount: group.unreadCount || 0,
        });
      }
    },

    groupUpdated: (state, action) => {
      const group = action.payload;

      const index = state.groups.findIndex(
        (item) => item._id.toString() === group._id.toString()
      );

      if (index === -1) {
        state.groups.unshift({
          ...group,
          lastMessage: group.lastMessage || null,
          unreadCount: group.unreadCount || 0,
        });
        return;
      }

      state.groups[index] = {
        ...state.groups[index],
        ...group,
      };
    },

    groupMessageReceived: (state, action) => {
      const { groupId, message, incrementUnread } = action.payload;

      const index = state.groups.findIndex(
        (group) => group._id.toString() === groupId.toString()
      );

      if (index === -1) {
        return;
      }

      const group = state.groups[index];

      const updatedGroup = {
        ...group,
        lastMessage: message,
        lastMessageTime: message.createdAt,
        updatedAt: message.createdAt,
        unreadCount: incrementUnread
          ? (group.unreadCount || 0) + 1
          : group.unreadCount || 0,
      };

      state.groups.splice(index, 1);
      state.groups.unshift(updatedGroup);
    },

    groupLastMessageEdited: (state, action) => {
      const { groupId, message } = action.payload;

      const group = state.groups.find(
        (item) => item._id.toString() === groupId.toString()
      );

      if (!group) return;

      if (
        group.lastMessage &&
        group.lastMessage._id?.toString() === message._id.toString()
      ) {
        group.lastMessage = message;
      }
    },

    groupLastMessageDeleted: (state, action) => {
      const { groupId, messageId , wasUnread} = action.payload;

      const group = state.groups.find(
        (item) => item._id.toString() === groupId.toString()
      );

      if (!group) return;

      if (
        group.lastMessage &&
        group.lastMessage._id?.toString() === messageId.toString()
      ) {
        group.lastMessage = null;
      }
      if(wasUnread && group.unreadCount > 0){
        group.unreadCount -= 1;
      }
    },

    clearGroupUnread: (state, action) => {
      const groupId = action.payload;

      const group = state.groups.find(
        (item) => item._id.toString() === groupId.toString()
      );

      if (group) {
        group.unreadCount = 0;
      }
    },

    memberLeftGroup: (state, action) => {
      const { groupId, userId } = action.payload;

      const group = state.groups.find(
        (item) => item._id.toString() === groupId.toString()
      );

      if (!group) return;

      group.members = group.members.filter(
        (member) => (member._id || member).toString() !== userId.toString()
      );
    },

    removeGroup: (state, action) => {
      state.groups = state.groups.filter(
        (group) => group._id.toString() !== action.payload.toString()
      );
    },

    clearGroupChat: (state, action) => {
      const groupId = action.payload?.toString();

      const group = state.groups.find(
        (group) => group._id?.toString() === groupId
      );

      if (group) {
        group.unreadCount = 0;
        group.lastMessage = null;
        group.lastMessageTime = null;
      }
    },
  },
});

export const {
  setGroups,
  addGroup,
  groupUpdated,
  groupMessageReceived,
  clearGroupUnread,
  memberLeftGroup,
  removeGroup,
  groupLastMessageEdited,
  groupLastMessageDeleted,
  clearGroupChat,
} = groupSlice.actions;

export default groupSlice.reducer;