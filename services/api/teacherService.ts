import api from './axios';

export interface TeacherPayload {
  name: string;
  phone: string;
  gender: string;
  email: string;
}

export const TeacherService = {
  getAll: () => api.get('/teachers'),

  getOne: (id: number) =>
    api.get(`/teachers/${id}`),

  create: (data: TeacherPayload) =>
    api.post('/teachers', data),

  update: (
    id: number,
    data: TeacherPayload,
  ) =>
    api.put(`/teachers/${id}`, data),

  remove: (id: number) =>
    api.delete(`/teachers/${id}`),

  // ── Subjects assigned to a teacher ───────────
  getSubjects: (id: number) =>
    api.get(`/teachers/${id}/subjects`),
};