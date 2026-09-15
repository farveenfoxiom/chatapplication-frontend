import api from "./api";

export const getMessages = async (userId, token) => {
  const response = await api.get(`/messages/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const sendMessage = async (receiver, text, token, file = null) => {
  const formData = new FormData();

  formData.append("receiver", receiver);

  if (text?.trim()) {
    formData.append("text", text.trim());
  }

  if (file) {
    formData.append("file", file);
  }

  const response = await api.post("/messages", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const deleteMessage = async (
  messageId,
  deleteFor,
  token
) => {
  const response = await api.delete(
    `/messages/${messageId}`,
    {
      data: {
        deleteFor,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const markMessagesAsRead = async (userId, token) => {
  const response = await api.put(
    `/messages/${userId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const editMessage = async (messageId, text, token) => {
  const response = await api.put(
    `/messages/${messageId}`,
    { text },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
