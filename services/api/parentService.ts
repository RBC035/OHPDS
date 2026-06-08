import api from './axios';

export interface ParentPayload {
  name: string;
  phone: string;
  email: string;
}

export const ParentService = {
  getAll: () => api.get('/parents'),

  getOne: (id: number) =>
    api.get(`/parents/${id}`),

  create: (data: ParentPayload) =>
    api.post('/parents', data),

  update: (
    id: number,
    data: ParentPayload,
  ) =>
    api.put(`/parents/${id}`, data),

  remove: (id: number) =>
    api.delete(`/parents/${id}`),
};