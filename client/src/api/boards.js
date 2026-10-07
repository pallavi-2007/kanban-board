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

export const moveCardApi = async (cardId, toListId, newIndex) => {
  const response = await api.patch(`/cards/${cardId}/move`, { toListId, newIndex });
  return response.data; // { cards: [...] }
};

export const moveListApi = async (listId, newIndex) => {
  const response = await api.patch(`/lists/${listId}/move`, { newIndex });
  return response.data; // { lists: [...] }
};

export const updateCardApi = async (cardId, cardData) => {
  const response = await api.patch(`/cards/${cardId}`, cardData);
  return response.data; // { card: ... }
};

export const deleteCardApi = async (cardId) => {
  const response = await api.delete(`/cards/${cardId}`);
  return response.data;
};

export const createCardApi = async (listId, cardData) => {
  const response = await api.post(`/lists/${listId}/cards`, cardData);
  return response.data; // { card: ... }
};

export const createListApi = async (boardId, title) => {
  const response = await api.post(`/boards/${boardId}/lists`, { title });
  return response.data; // { list: ... }
};

export const updateListApi = async (listId, title) => {
  const response = await api.patch(`/lists/${listId}`, { title });
  return response.data; // { list: ... }
};

export const deleteListApi = async (listId) => {
  const response = await api.delete(`/lists/${listId}`);
  return response.data;
};

export const aiBreakdownCardApi = async (cardId) => {
  const response = await api.post('/ai/breakdown', { cardId });
  return response.data; // { card: ... }
};
