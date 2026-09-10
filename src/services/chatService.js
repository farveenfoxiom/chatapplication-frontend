import api from "./api";

export const getRecentChats = async (token) => {
  const response = await api.get("/chats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteChat = async (userId, token) => {
  const response = await api.delete(
    `/chats/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getChatPreview = async (userId, token) => {
  const response = await api.get(
    `/chats/preview/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};