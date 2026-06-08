import api from './axios';

export interface StudentTaskPayload {
  homeworkId: number;
  task: string;
  submitDate: string;
}

export const StudentTaskService = {
  getAll: () => api.get('/student-tasks'),

  getOne: (id: number) =>
    api.get(`/student-tasks/${id}`),

  getByHomework: (id: number) =>
    api.get(`/homework/${id}/tasks`),

  create: (data: FormData) =>
    api.post('/student-tasks', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/student-tasks/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  remove: (id: number) =>
    api.delete(`/student-tasks/${id}`),
};