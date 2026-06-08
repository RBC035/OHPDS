import api from './axios';

export interface StudentClassPayload {
  stuentId:  number | string;   // DB column is "stuentId" (not studentId)
  studentId?: number | string;  // also accept correctly-named key when clients send it
  classId:   number | string;
  studyYear: string;
}

export const StudentClassService = {
  getAll: () => api.get('/student-classes'),

  getOne: (id: number | string) =>
    api.get(`/student-classes/${id}`),

  create: (data: StudentClassPayload) =>
    api.post('/student-classes', data),

  update: (id: number | string, data: Partial<StudentClassPayload>) =>
    api.put(`/student-classes/${id}`, data),

  remove: (id: number | string) =>
    api.delete(`/student-classes/${id}`),

  // GET /students/{id}/classes  →  classes assigned to a student
  getByStudent: (studentId: number | string) =>
    api.get(`/students/${studentId}/classes`),

  // GET /classes/{id}/students  →  students in a class
  getByClass: (classId: number | string) =>
    api.get(`/classes/${classId}/students`),
};
