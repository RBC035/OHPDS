import api from './axios';

// ---- Allowed file types -----------------------------------------------------

export const HOMEWORK_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
] as const;

export type HomeworkExtension = (typeof HOMEWORK_ALLOWED_EXTENSIONS)[number];

// Extension -> correct MIME type. Used to fix the generic/empty MIME types
// that document pickers often return for Office files.
const MIME_BY_EXTENSION: Record<HomeworkExtension, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

// Pass this to your document picker's `type` option so the OS picker only
// shows these formats. Works with expo-document-picker and
// react-native-document-picker.
export const HOMEWORK_PICKER_MIME_TYPES = Object.values(MIME_BY_EXTENSION);

// ---- Types ------------------------------------------------------------------

export interface UploadFile {
  uri: string;
  name: string;
  type?: string; // may be missing/generic from the picker; we correct it
}

export interface HomeworkInput {
  subjectId: number;
  classId: number;
  title: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  description?: string;
  status?: string;
  file?: UploadFile; // required on create; optional on update
}

const MULTIPART = {
  headers: { 'Content-Type': 'multipart/form-data' },
};

// ---- Helpers ----------------------------------------------------------------

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isAllowedHomeworkFile(name: string): boolean {
  return (HOMEWORK_ALLOWED_EXTENSIONS as readonly string[]).includes(
    getExtension(name),
  );
}

/**
 * Resolves the correct MIME type from the file's extension, ignoring whatever
 * (possibly wrong) type the picker supplied. Falls back to octet-stream.
 */
function resolveMimeType(name: string): string {
  const ext = getExtension(name) as HomeworkExtension;
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

/**
 * Builds FormData with the exact field names the backend expects.
 * Throws if a file is provided with an unsupported extension, so you can
 * catch it and show a message before any upload happens.
 */
function buildHomeworkFormData(input: Partial<HomeworkInput>): FormData {
  const fd = new FormData();

  if (input.subjectId !== undefined) fd.append('subjectId', String(input.subjectId));
  if (input.classId !== undefined) fd.append('classId', String(input.classId));
  if (input.title !== undefined) fd.append('title', input.title);
  if (input.startDate !== undefined) fd.append('startDate', input.startDate);
  if (input.endDate !== undefined) fd.append('endDate', input.endDate);
  if (input.description !== undefined) fd.append('description', input.description);
  if (input.status !== undefined) fd.append('status', input.status);

  if (input.file) {
    if (!isAllowedHomeworkFile(input.file.name)) {
      throw new Error(
        `Unsupported file type. Allowed: ${HOMEWORK_ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Field name must be "homework" to match $_FILES['homework'].
    fd.append('homework', {
      uri: input.file.uri,
      name: input.file.name,
      type: resolveMimeType(input.file.name), // correct MIME from extension
    } as any);
  }

  return fd;
}

// ---- Service ----------------------------------------------------------------

export const HomeworkService = {
  getAll: () => api.get('/homework'),

  getOne: (id: number) => api.get(`/homework/${id}`),

  getByClass: (classId: number) => api.get(`/classes/${classId}/homework`),

  getBySubject: (subjectId: number) => api.get(`/subjects/${subjectId}/homework`),

  /**
   * Create homework. `file` is required by the backend and must be one of:
   * pdf, doc, docx, ppt, pptx. Posting this triggers the parent SMS.
   */
  create: (input: HomeworkInput) =>
    api.post('/homework', buildHomeworkFormData(input), MULTIPART),

  /**
   * Update homework. Sent as POST (see note above) to /homework/{id}.
   * Any omitted field keeps its existing value on the backend.
   */
  update: (id: number, input: Partial<HomeworkInput>) =>
    api.post(`/homework/${id}`, buildHomeworkFormData(input), MULTIPART),

  remove: (id: number) => api.delete(`/homework/${id}`),

  // Escape hatch if you already built FormData yourself.
  createRaw: (data: FormData) => api.post('/homework', data, MULTIPART),
  updateRaw: (id: number, data: FormData) =>
    api.post(`/homework/${id}`, data, MULTIPART),
};