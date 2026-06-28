import api from './axios';

// ---- Allowed file types -----------------------------------------------------

export const TASK_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
] as const;

export type TaskExtension = (typeof TASK_ALLOWED_EXTENSIONS)[number];

// Extension -> correct MIME type, to fix the generic/empty types pickers and
// cameras often return.
const MIME_BY_EXTENSION: Record<TaskExtension, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

// Hand this to a document picker's `type` option to restrict selection.
export const TASK_PICKER_MIME_TYPES = Array.from(
  new Set(Object.values(MIME_BY_EXTENSION)),
);

// ---- Types ------------------------------------------------------------------

export interface UploadFile {
  uri: string;
  name: string;
  type?: string; // may be missing/generic; we correct it from the extension
}

export interface StudentTaskInput {
  homeworkId: number;
  studentId: number;          // REQUIRED by the backend (was missing before)
  submitDate: string;         // 'YYYY-MM-DD'
  file?: UploadFile;          // required on create; optional on update
}

const MULTIPART = {
  headers: { 'Content-Type': 'multipart/form-data' },
};

// ---- Helpers ----------------------------------------------------------------

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isAllowedTaskFile(name: string): boolean {
  return (TASK_ALLOWED_EXTENSIONS as readonly string[]).includes(
    getExtension(name),
  );
}

function resolveMimeType(name: string): string {
  const ext = getExtension(name) as TaskExtension;
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/**
 * Builds FormData with the field names the backend expects.
 * Throws if a file is provided with an unsupported extension, so the caller
 * can show a message before any upload happens.
 */
function buildTaskFormData(input: Partial<StudentTaskInput>): FormData {
  const fd = new FormData();

  if (input.homeworkId !== undefined) fd.append('homeworkId', String(input.homeworkId));
  if (input.studentId !== undefined) fd.append('studentId', String(input.studentId));
  if (input.submitDate !== undefined) fd.append('submitDate', input.submitDate);

  if (input.file) {
    if (!isAllowedTaskFile(input.file.name)) {
      throw new Error(
        `Unsupported file type. Allowed: ${TASK_ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Field name must be "task" to match $_FILES['task'].
    fd.append('task', {
      uri: input.file.uri,
      name: input.file.name,
      type: resolveMimeType(input.file.name),
    } as any);
  }

  return fd;
}

// ---- Service ----------------------------------------------------------------

export const StudentTaskService = {
  getAll: () => api.get('/student-tasks'),

  getOne: (id: number) => api.get(`/student-tasks/${id}`),

  getByHomework: (homeworkId: number) =>
    api.get(`/homework/${homeworkId}/tasks`),

  /**
   * Submit a task. homeworkId, studentId, submitDate and a file are all
   * required. Posting this triggers the SMS notification to the teacher(s).
   */
  create: (input: StudentTaskInput) =>
    api.post('/student-tasks', buildTaskFormData(input), MULTIPART),

  /**
   * Update a submission. Sent as POST (see note above) to /student-tasks/{id}.
   * Any omitted field keeps its existing value on the backend.
   */
  update: (id: number, input: Partial<StudentTaskInput>) =>
    api.post(`/student-tasks/${id}`, buildTaskFormData(input), MULTIPART),

  remove: (id: number) => api.delete(`/student-tasks/${id}`),

  // Escape hatch if you already built FormData yourself.
  createRaw: (data: FormData) => api.post('/student-tasks', data, MULTIPART),
  updateRaw: (id: number, data: FormData) =>
    api.post(`/student-tasks/${id}`, data, MULTIPART),
};