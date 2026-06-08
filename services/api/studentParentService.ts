import api from './axios';

export interface StudentParentPayload {
  stuentId:  number | string;   // DB column is "stuentId" (matches student_parent table)
  parentId:  number | string;
  status:    string;            // e.g. "active"
}

export const StudentParentService = {
  getAll: () => api.get('/student-parents'),

  getOne: (id: number | string) =>
    api.get(`/student-parents/${id}`),

  create: (data: StudentParentPayload) =>
    api.post('/student-parents', data),

  update: (id: number | string, data: Partial<StudentParentPayload>) =>
    api.put(`/student-parents/${id}`, data),

  remove: (id: number | string) =>
    api.delete(`/student-parents/${id}`),

  // GET /parents/{id}/students  →  students linked to a parent
  getByParent: (parentId: number | string) =>
    api.get(`/parents/${parentId}/students`),

  // GET /students/{id}/parents  →  parents linked to a student
  getByStudent: (studentId: number | string) =>
    api.get(`/students/${studentId}/parents`),
};
