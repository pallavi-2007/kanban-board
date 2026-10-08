import api from './client.js';

export const fetchUsers = async () => {
  const response = await api.get('/users');
  return response.data; // { users: [...] }
};

export const updateUserRole = async (userId, role) => {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data; // { message, user }
};
