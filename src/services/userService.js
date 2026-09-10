import api from "./api";

export const getMe = async (token) => {
  const response = await api.get("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const searchUsers = async (
  query,
  token,
  skip = 0,
  limit = 7
) => {
  const response = await api.get(
    `/users/search?query=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getUserById = async (userId, token) => {
  const response = await api.get(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateMe = async (userData, token) => {
  const response = await api.put(
    "/users/me",
    userData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const uploadProfileImage = async (file, token) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post(
    "/users/me/image",
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};