import api from "./api";

export const createGroup = async (name,memberIds,token) => {
  const response = await api.post(
    "/groups",
    {name,memberIds},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getUserGroups = async (token) => {
  const response = await api.get(
    "/groups",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getGroupById = async (groupId,token) => {
  const response = await api.get(
    `/groups/${groupId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const updateGroup = async (
  groupId,
  name,
  bio,
  groupImage,
  token
) => {
  const formData = new FormData();

  if (name !== undefined) {
    formData.append("name",name);
  }

  if (bio !== undefined) {
    formData.append("bio",bio);
  }

  if (groupImage) {
    formData.append("groupImage",groupImage);
  }

  const response = await api.put(
    `/groups/${groupId}`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const updateGroupAdmin = async (
  groupId,
  userId,
  action,
  token
) => {
  const response = await api.put(
    `/groups/${groupId}/admins`,
    {
      userId,
      action,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getGroupMessages = async (
  groupId,
  token,
  limit = 20,
  before = null
) => {
  const params = {
    limit,
  };

  if (before) {
    params.before = before;
  }

  const response = await api.get(
    `/groups/${groupId}/messages`,
    {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const addGroupMembers = async (
  groupId,
  addMemberIds,
  token
) => {
  const response = await api.put(
    `/groups/${groupId}/members`,
    {addMemberIds},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const removeGroupMember = async (
  groupId,
  removeMemberId,
  token
) => {
  const response = await api.put(
    `/groups/${groupId}/members`,
    {removeMemberId},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const leaveGroup = async (groupId,token) => {
  const response = await api.post(
    `/groups/${groupId}/leave`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const sendGroupMessage = async (
  groupId,
  text,
  token,
  file = null
) => {
  const formData = new FormData();

  formData.append("group",groupId);

  if (text?.trim()) {
    formData.append("text",text.trim());
  }

  if (file) {
    formData.append("file",file);
  }

  const response = await api.post(
    "/messages",
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const markGroupMessagesAsRead = async (groupId,token) => {
  const response = await api.patch(
    `/groups/${groupId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const clearGroupChat = async (groupId,token) => {
  const response = await api.patch(
    `/groups/${groupId}/clear`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const sendGroupLocationMessage = async (
  groupId,
  latitude,
  longitude,
  token,
  isLive = false,
  liveDurationMinutes = null
) => {
  const response = await api.post(
    "/messages/location",
    {
      group: groupId,
      latitude,
      longitude,
      isLive,
      liveDurationMinutes,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};