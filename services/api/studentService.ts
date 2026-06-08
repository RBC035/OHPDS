import api from './axios';

export interface StudentPayload {
  name: string;
  gender: string;
  dob: string;
}

export const StudentService = {
  getAll: () => api.get('/students'),

  getOne: (id: number) =>
    api.get(`/students/${id}`),

  create: (data: StudentPayload) =>
    api.post('/students', data),

  update: (
    id: number,
    data: StudentPayload,
  ) =>
    api.put(`/students/${id}`, data),

  remove: (id: number) =>
    api.delete(`/students/${id}`),
};