import api from './axios';

export interface HomeworkPayload {
  subjectId: number;
  classId: number;
  title: string;
  homework?: string;
  startDate: string;
  endDate: string;
  description?: string;
  status?: string;
}

export const HomeworkService = {
  getAll: () => api.get('/homework'),

  getOne: (id: number) =>
    api.get(`/homework/${id}`),

  getByClass: (id: number) =>
    api.get(`/classes/${id}/homework`),

  getBySubject: (id: number) =>
    api.get(`/subjects/${id}/homework`),

  create: (data: FormData) =>
    api.post('/homework', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/homework/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  remove: (id: number) =>
    api.delete(`/homework/${id}`),
};