import api from './axios';

export interface StudentSubjectPayload {
  stuentId:  number | string;   // DB column is "stuentId" (not studentId)
  studentId?: number | string;  // also accept correctly-named key when clients send it
  subjectId: number | string;
  status:    string;            // e.g. "active"
}

export const StudentSubjectService = {
  getAll: () => api.get('/student-subjects'),

  getOne: (id: number | string) =>
    api.get(`/student-subjects/${id}`),

  create: (data: StudentSubjectPayload) =>
    api.post('/student-subjects', data),

  update: (id: number | string, data: Partial<StudentSubjectPayload>) =>
    api.put(`/student-subjects/${id}`, data),

  remove: (id: number | string) =>
    api.delete(`/student-subjects/${id}`),

  // GET /students/{id}/subjects  →  subjects enrolled by a student
  getByStudent: (studentId: number | string) =>
    api.get(`/students/${studentId}/subjects`),

  // GET /subjects/{id}/students  →  students in a subject
  getBySubject: (subjectId: number | string) =>
    api.get(`/subjects/${subjectId}/students`),
};
