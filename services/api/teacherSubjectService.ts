import api from './axios';

export interface TeacherSubjectPayload {
  subjectId: number | string;
  teacherId: number | string;
  addedDate: string;   // YYYY-MM-DD
  status: string;      // e.g. "active"
}

export const TeacherSubjectService = {
  getAll: () => api.get('/teacher-subjects'),

  getOne: (id: number | string) =>
    api.get(`/teacher-subjects/${id}`),

  create: (data: TeacherSubjectPayload) =>
    api.post('/teacher-subjects', data),

  update: (id: number | string, data: Partial<TeacherSubjectPayload>) =>
    api.put(`/teacher-subjects/${id}`, data),

  remove: (id: number | string) =>
    api.delete(`/teacher-subjects/${id}`),

  // GET /teachers/{id}/subjects  →  subjects assigned to a teacher
  getByTeacher: (teacherId: number | string) =>
    api.get(`/teachers/${teacherId}/subjects`),

  // GET /subjects/{id}/teachers  →  teachers assigned to a subject
  getBySubject: (subjectId: number | string) =>
    api.get(`/subjects/${subjectId}/teachers`),
};
