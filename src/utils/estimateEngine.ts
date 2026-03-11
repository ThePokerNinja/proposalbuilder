import { Answer, Task, Estimate, Question } from '../types';
import { QUESTIONS } from '../config/questions';
import { getLearningData } from './learningEngine';

export function calculateEstimate(answers: Answer[]): Task[] {
  const learningData = getLearningData();
  const tasks: Task[] = [
    { id: 'discovery', name: 'Discovery & Strategy', baseHours: 8, multiplier: 1, category: 'Planning' },
    { id: 'research', name: 'Research & Analysis', baseHours: 12, multiplier: 1, category: 'Planning' },
    { id: 'branding', name: 'Brand Identity Design', baseHours: 20, multiplier: 1, category: 'Design' },
    { id: 'ui-design', name: 'UI/UX Design', baseHours: 40, multiplier: 1, category: 'Design' },
    { id: 'content', name: 'Content Creation', baseHours: 16, multiplier: 1, category: 'Content' },
    { id: 'development', name: 'Development', baseHours: 60, multiplier: 1, category: 'Development' },
    { id: 'testing', name: 'Testing & QA', baseHours: 12, multiplier: 1, category: 'Quality' },
    { id: 'revisions', name: 'Revisions & Refinement', baseHours: 16, multiplier: 1, category: 'Quality' },
    { id: 'launch', name: 'Launch & Handoff', baseHours: 8, multiplier: 1, category: 'Deployment' },
  ];

  // Apply multipliers based on answers
  answers.forEach((answer) => {
    const question = QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) return;

    const value = Array.isArray(answer.value) ? answer.value : [answer.value];
    const impact = question.weight;

    switch (answer.questionId) {
      case 'project-type':
        if (value.includes('Combined Project')) {
          tasks.find((t) => t.id === 'branding')!.multiplier *= 1.5;
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 1.3;
        }
        break;

      case 'project-scale':
        if (value.includes('Small')) {
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 0.6;
          tasks.find((t) => t.id === 'development')!.multiplier *= 0.6;
        } else if (value.includes('Medium')) {
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 1.0;
          tasks.find((t) => t.id === 'development')!.multiplier *= 1.0;
        } else if (value.includes('Large')) {
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 1.8;
          tasks.find((t) => t.id === 'development')!.multiplier *= 1.8;
        } else if (value.includes('Enterprise')) {
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 2.5;
          tasks.find((t) => t.id === 'development')!.multiplier *= 2.5;
          tasks.find((t) => t.id === 'research')!.multiplier *= 1.5;
        }
        break;

      case 'content-status':
        if (value.includes('Need content creation') || value.includes('Starting from scratch')) {
          tasks.find((t) => t.id === 'content')!.multiplier *= 2.0;
        } else if (value.includes('Some content ready')) {
          tasks.find((t) => t.id === 'content')!.multiplier *= 1.3;
        }
        break;

      case 'integration-complexity':
        if (Array.isArray(answer.value)) {
          const complexity = answer.value.length;
          tasks.find((t) => t.id === 'development')!.multiplier *= 1 + complexity * 0.2;
          if (answer.value.includes('Custom backend development')) {
            tasks.find((t) => t.id === 'development')!.multiplier *= 1.5;
          }
        }
        break;

      case 'revision-expectations':
        if (value.includes('3-4 rounds')) {
          tasks.find((t) => t.id === 'revisions')!.multiplier *= 1.5;
        } else if (value.includes('5+ rounds') || value.includes('Iterative')) {
          tasks.find((t) => t.id === 'revisions')!.multiplier *= 2.0;
        }
        break;

      case 'timeline-preference':
        if (value.includes('Rush')) {
          // Rush projects may need more hours due to parallel work
          tasks.forEach((t) => {
            if (t.category === 'Development' || t.category === 'Design') {
              t.multiplier *= 1.2;
            }
          });
        }
        break;
    }
  });

  return tasks;
}

export function calculateTimeline(totalHours: number, timelinePreference?: string): { weeks: number; startDate: Date; endDate: Date } {
  const startDate = new Date();
  let weeks: number;

  // Base calculation: assume 40 hours/week capacity
  const baseWeeks = Math.ceil(totalHours / 40);

  if (timelinePreference?.includes('Rush')) {
    weeks = Math.max(2, Math.ceil(baseWeeks * 0.6));
  } else if (timelinePreference?.includes('Standard')) {
    weeks = Math.max(4, Math.ceil(baseWeeks * 1.0));
  } else if (timelinePreference?.includes('Flexible')) {
    weeks = Math.max(8, Math.ceil(baseWeeks * 1.5));
  } else {
    weeks = Math.max(4, baseWeeks);
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeks * 7);

  return { weeks, startDate, endDate };
}

export function createEstimate(answers: Answer[]): Estimate {
  const tasks = calculateEstimate(answers);
  const totalHours = tasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
  
  const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference');
  const timeline = calculateTimeline(totalHours, timelineAnswer?.value as string);

  return {
    tasks,
    totalHours,
    timeline,
  };
}
