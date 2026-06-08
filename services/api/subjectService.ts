import api from './axios';

export interface SubjectPayload {
  name: string;
  status?: string;
}

export interface SubjectClassPayload {
  class_id: string | number;
}

export interface SubjectTeacherPayload {
  teacher_id: string | number;
}

export const SubjectService = {
  getAll: () => api.get('/subjects'),

  getActive: () => api.get('/subjects/active'),

  getOne: (id: string | number) =>
    api.get(`/subjects/${id}`),

  create: (data: SubjectPayload) =>
    api.post('/subjects', data),

  update: (id: string | number, data: SubjectPayload) =>
    api.put(`/subjects/${id}`, data),

  remove: (id: string | number) =>
    api.delete(`/subjects/${id}`),

  // ── Classes assigned to a subject ────────────
  getClasses: (subjectId: string | number) =>
    api.get(`/subjects/${subjectId}/classes`),

  assignClass: (subjectId: string | number, data: SubjectClassPayload) =>
    api.post(`/subjects/${subjectId}/classes`, data),

  removeClass: (subjectId: string | number, classId: string | number) =>
    api.delete(`/subjects/${subjectId}/classes/${classId}`),

  // ── Teachers assigned to a subject ───────────
  getTeachers: (subjectId: string | number) =>
    api.get(`/subjects/${subjectId}/teachers`),
};
