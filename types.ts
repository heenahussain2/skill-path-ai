export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'blog' | 'documentation' | 'other';
}

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  resources?: Resource[];
}

export interface Session {
  start: number;
  end: number | null;
}

export interface DayPlan {
  dayNumber: number;
  title: string;
  description: string; // Step by step details
  tasks: Task[];
  notes?: string;
  sessions?: Session[];
}

export interface LearningPlan {
  id: string;
  topic: string;
  durationDays: number;
  dailyTime: string;
  startDate: string; // ISO String
  lastUpdated: string;
  days: DayPlan[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface PlanGenerationParams {
  topic: string;
  days: number;
  timePerDay: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}