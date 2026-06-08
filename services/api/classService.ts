import api from './axios';

export interface ClassPayload {
  name: string;
  status?: string;
}

export interface ClassStudentPayload {
  name: string;
  roll_no?: string;
  gender: 'M' | 'F';
}

export interface ClassSubjectPayload {
  name: string;
  teacher?: string;
}

export const ClassService = {
  getAll: () => api.get('/classes'),

  getOne: (id: string | number) =>
    api.get(`/classes/${id}`),

  create: (data: ClassPayload) =>
    api.post('/classes', data),

  update: (id: string | number, data: ClassPayload) =>
    api.put(`/classes/${id}`, data),

  remove: (id: string | number) =>
    api.delete(`/classes/${id}`),

  // ── Students within a class ──────────────────────
  getStudents: (classId: string | number) =>
    api.get(`/classes/${classId}/students`),

  addStudent: (classId: string | number, data: ClassStudentPayload) =>
    api.post(`/classes/${classId}/students`, data),

  updateStudent: (
    classId: string | number,
    studentId: string | number,
    data: ClassStudentPayload,
  ) => api.put(`/classes/${classId}/students/${studentId}`, data),

  removeStudent: (classId: string | number, studentId: string | number) =>
    api.delete(`/classes/${classId}/students/${studentId}`),

  // ── Subjects within a class ──────────────────────
  getSubjects: (classId: string | number) =>
    api.get(`/classes/${classId}/subjects`),

  addSubject: (classId: string | number, data: ClassSubjectPayload) =>
    api.post(`/classes/${classId}/subjects`, data),

  updateSubject: (
    classId: string | number,
    subjectId: string | number,
    data: ClassSubjectPayload,
  ) => api.put(`/classes/${classId}/subjects/${subjectId}`, data),

  removeSubject: (classId: string | number, subjectId: string | number) =>
    api.delete(`/classes/${classId}/subjects/${subjectId}`),
};
