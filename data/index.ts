import { Colors } from "@/constants";

export const CHILDREN = [
  {
    id: "1",
    name: "Mussa Said Haji",
    grade: "Form one",
    avatar: "👦",
    pending: 3,
    submitted: 8,
    subjects: 6,
    attendance: "55%",
  },
  {
    id: "2",
    name: "Salma Rashid Makame",
    grade: "Standard 6",
    avatar: "👧",
    pending: 1,
    submitted: 12,
    subjects: 5,
    attendance: "98%",
  },

   {
    id: "3",
    name: "Haitham Rashid Makame",
    grade: "Standard 5",
    avatar: "👦",
    pending: 3,
    submitted: 8,
    subjects: 6,
    attendance: "44%",
  },
  {
    id: "4",
    name: "Vuai Saidi Haji",
    grade: "Standard 2",
    avatar: "👧",
    pending: 1,
    submitted: 20,
    subjects: 6,
    attendance: "76%",
  },
    {
    id: "5",
    name: "Juma Saidi Haji",
    grade: "Standard 1",
    avatar: "👧",
    pending: 1,
    submitted: 16,
    subjects: 5,
    attendance: "88%",
  },
];

export type HomeworkStatus = "pending" | "submitted" | "overdue";

export type HomeworkItem = {
  id: string;
  subject: string;
  title: string;
  due: string;
  child: string;
  status: HomeworkStatus;
  color: string;
  icon: string;
};

export const HOMEWORK: HomeworkItem[] = [
  { id: "1", subject: "Mathematics",    title: "Fractions Exercise",    due: "Today",     child: "Haitham Mussa", status: "pending",   color: Colors.orange, icon: "calculator-outline" },
  { id: "2", subject: "English",        title: "Reading Comprehension", due: "Tomorrow",  child: "Salma Rashid",  status: "pending",   color: Colors.blue,   icon: "book-outline" },
  { id: "3", subject: "Science",        title: "Plant Life Cycle",      due: "Thu",       child: "Haitham Mussa", status: "submitted", color: Colors.teal,   icon: "leaf-outline" },
  { id: "4", subject: "Social Studies", title: "Map Drawing",           due: "Fri",       child: "Salma Rashid",  status: "submitted", color: Colors.violet, icon: "globe-outline" },
  { id: "5", subject: "Kiswahili",      title: "Insha ya Mazingira",    due: "Yesterday", child: "Haitham Mussa", status: "overdue",   color: Colors.error,  icon: "warning-outline" },
  { id: "6", subject: "History",        title: "Colonial Era Notes",    due: "Mon",       child: "Salma Rashid",  status: "overdue",   color: Colors.error,  icon: "warning-outline" },
];


/* ─────────────────────────────
   HOMEWORK DETAILS MOCK DATA
───────────────────────────── */

export type FileType = "pdf" | "word" | "ppt" | "other";

export interface HomeworkFile {
  name: string;
  type: FileType;
  size: string;
  url: string;
}

export interface HomeworkDetail {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  teacherPhone: string;
  startDate: string;
  endDate: string;
  status: "pending" | "submitted" | "overdue";
  content: string;
  files: HomeworkFile[];
}

export const HOMEWORK_DETAILS: HomeworkDetail[] = [
  {
    id: "1",
    title: "Fractions Exercise",
    subject: "Mathematics",
    teacher: "Mr. James Omondi",
    teacherPhone: "+255 712 345 678",
    startDate: "2026-05-20",
    endDate: "2026-05-30",
    status: "pending",
    content:
      "Solve all fraction questions from page 45 to 50. Show all calculations clearly and submit before deadline.",

    files: [
      {
        name: "Fractions_Instructions.pdf",
        type: "pdf",
        size: "1.2 MB",
        url: "https://example.com/fractions.pdf",
      },

      {
        name: "Fraction_Formula_Sheet.pdf",
        type: "pdf",
        size: "420 KB",
        url: "https://example.com/formula.pdf",
      },

      {
        name: "Math_Template.docx",
        type: "word",
        size: "95 KB",
        url: "https://example.com/template.docx",
      },

      {
        name: "Fractions_Lesson_Slides.pptx",
        type: "ppt",
        size: "2.1 MB",
        url: "https://example.com/slides.pptx",
      },
    ],
  },

  {
    id: "2",
    title: "Reading Comprehension",
    subject: "English",
    teacher: "Mrs. Asha Suleiman",
    teacherPhone: "+255 713 456 111",
    startDate: "2026-05-21",
    endDate: "2026-05-28",
    status: "submitted",
    content:
      "Read the provided passage and answer all comprehension questions in complete sentences.",

    files: [
      {
        name: "English_Comprehension.pdf",
        type: "pdf",
        size: "850 KB",
        url: "https://example.com/english.pdf",
      },

      {
        name: "Answer_Template.docx",
        type: "word",
        size: "110 KB",
        url: "https://example.com/answer.docx",
      },

      {
        name: "Class_Presentation.pptx",
        type: "ppt",
        size: "3.4 MB",
        url: "https://example.com/presentation.pptx",
      },
    ],
  },

  {
    id: "3",
    title: "Plant Life Cycle",
    subject: "Science",
    teacher: "Dr. Hamad Ali",
    teacherPhone: "+255 744 222 333",
    startDate: "2026-05-18",
    endDate: "2026-05-25",
    status: "overdue",
    content:
      "Draw and explain the plant life cycle stages with labeled diagrams.",

    files: [
      {
        name: "Science_Guide.pdf",
        type: "pdf",
        size: "1.8 MB",
        url: "https://example.com/science.pdf",
      },

      {
        name: "Plant_Diagram_Template.docx",
        type: "word",
        size: "130 KB",
        url: "https://example.com/diagram.docx",
      },

      {
        name: "Science_Class_Slides.pptx",
        type: "ppt",
        size: "4.2 MB",
        url: "https://example.com/science-slides.pptx",
      },
    ],
  },
];