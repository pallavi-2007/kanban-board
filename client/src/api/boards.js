import api from './client.js';

export const fetchBoards = async () => {
  const response = await api.get('/boards');
  return response.data;
};

export const fetchBoardById = async (boardId) => {
  const response = await api.get(`/boards/${boardId}`);
  return response.data;
};

export const createBoard = async (boardData) => {
  const response = await api.post('/boards', boardData);
  return response.data;
};

export const updateBoard = async (boardId, boardData) => {
  const response = await api.patch(`/boards/${boardId}`, boardData);
  return response.data;
};

export const deleteBoard = async (boardId) => {
  const response = await api.delete(`/boards/${boardId}`);
  return response.data;
};

export const addBoardMember = async (boardId, email) => {
  const response = await api.post(`/boards/${boardId}/members`, { email });
  return response.data;
};

export const removeBoardMember = async (boardId, userId) => {
  const response = await api.delete(`/boards/${boardId}/members/${userId}`);
  return response.data;
};
