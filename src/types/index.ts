export interface Question {
  id: string;
  text: string;
  type: 'text' | 'select' | 'multi-select' | 'number' | 'scale';
  options?: string[];
  category: 'scope' | 'audience' | 'goals' | 'constraints';
  weight: number; // How much this question affects the estimate
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
}

export interface Task {
  id: string;
  name: string;
  baseHours: number;
  multiplier: number; // Adjustable by user
  category: string;
  selected?: boolean; // Whether task is selected in estimate
}

export interface Estimate {
  tasks: Task[];
  totalHours: number;
  timeline: {
    weeks: number;
    startDate: Date;
    endDate: Date;
  };
}

export interface ProjectContext {
  projectType: 'design' | 'branding' | 'website' | 'combined';
  answers: Answer[];
  estimate: Estimate | null;
}
