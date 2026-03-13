import { Answer, Task, Estimate } from '../types';
import { generateContextualTasks } from './taskGenerator';

export function calculateEstimate(answers: Answer[], projectName?: string, projectSummary?: string): Task[] {
  // Use contextual task generation if project context is available (projectName is enough)
  if (projectName) {
    return generateContextualTasks(projectName, projectSummary || '', answers);
  }
  
  // Fallback to default tasks if no context (for backward compatibility)
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

  // Apply multipliers based on answers (supports both old and new question IDs)
  answers.forEach((answer) => {
    const value = Array.isArray(answer.value) ? answer.value : [answer.value];
    const stringValue = typeof answer.value === 'string' ? answer.value : Array.isArray(answer.value) ? answer.value.join(' ') : String(answer.value);

    switch (answer.questionId) {
      // Old question IDs (for backward compatibility)
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
      case 'content-strategy':
        if (stringValue.includes('Need content creation') || stringValue.includes('Starting from scratch') || stringValue.includes('starting from scratch')) {
          tasks.find((t) => t.id === 'content')!.multiplier *= 2.0;
        } else if (stringValue.includes('Some content ready') || stringValue.includes('some content')) {
          tasks.find((t) => t.id === 'content')!.multiplier *= 1.3;
        }
        break;

      case 'integration-complexity':
      case 'technical-requirements':
        if (Array.isArray(answer.value)) {
          const complexity = answer.value.length;
          tasks.find((t) => t.id === 'development')!.multiplier *= 1 + complexity * 0.15;
          if (stringValue.includes('Custom backend') || stringValue.includes('backend development')) {
            tasks.find((t) => t.id === 'development')!.multiplier *= 1.5;
          }
          if (stringValue.includes('E-commerce') || stringValue.includes('ecommerce')) {
            tasks.find((t) => t.id === 'development')!.multiplier *= 1.3;
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
      case 'timeline-urgency':
        if (stringValue.includes('Time-sensitive') || stringValue.includes('Rush') || stringValue.includes('2-4 weeks')) {
          // Rush projects may need more hours due to parallel work
          tasks.forEach((t) => {
            if (t.category === 'Development' || t.category === 'Design') {
              t.multiplier *= 1.2;
            }
          });
        }
        break;

      // New personalized question IDs
      case 'project-scope':
        // Map scope answers to multipliers
        if (stringValue.includes('Complete') || stringValue.includes('Full')) {
          tasks.find((t) => t.id === 'branding')!.multiplier *= 1.3;
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 1.3;
        }
        if (stringValue.includes('e-commerce') || stringValue.includes('E-commerce')) {
          tasks.find((t) => t.id === 'development')!.multiplier *= 1.5;
        }
        break;

      case 'current-state':
        if (stringValue.includes('Starting from scratch') || stringValue.includes('no existing')) {
          tasks.find((t) => t.id === 'discovery')!.multiplier *= 1.5;
          tasks.find((t) => t.id === 'research')!.multiplier *= 1.3;
        } else if (stringValue.includes('complete overhaul')) {
          tasks.find((t) => t.id === 'ui-design')!.multiplier *= 1.4;
          tasks.find((t) => t.id === 'development')!.multiplier *= 1.4;
        }
        break;

      case 'business-value':
        // More value goals = more comprehensive solution
        if (Array.isArray(answer.value)) {
          const valueCount = answer.value.length;
          if (valueCount > 4) {
            tasks.forEach((t) => {
              if (t.category === 'Design' || t.category === 'Development') {
                t.multiplier *= 1.1;
              }
            });
          }
        }
        break;

      case 'investment-clarity':
        // Higher budget = more comprehensive solution
        if (stringValue.includes('$75,000+') || stringValue.includes('Enterprise')) {
          tasks.forEach((t) => {
            t.multiplier *= 1.3;
          });
        } else if (stringValue.includes('$35,000 - $75,000')) {
          tasks.forEach((t) => {
            t.multiplier *= 1.1;
          });
        } else if (stringValue.includes('Under $15,000')) {
          tasks.forEach((t) => {
            if (t.category === 'Development' || t.category === 'Design') {
              t.multiplier *= 0.8;
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
  // Always calculate based on actual hours - no artificial minimums
  const baseWeeks = totalHours / 40; // Use decimal for accuracy

  // Normalize timeline preference string for matching
  const prefLower = timelinePreference?.toLowerCase() || '';

  if (prefLower.includes('time-sensitive') || prefLower.includes('rush') || prefLower.includes('2-4 weeks')) {
    // Rush: compress timeline, may require more parallel work
    weeks = Math.max(1, Math.ceil(baseWeeks * 0.7)); // 30% faster, minimum 1 week
  } else if (prefLower.includes('strategic') || prefLower.includes('3-6 months') || prefLower.includes('flexible') || prefLower.includes('long-term')) {
    // Strategic/Flexible: allow more time for quality
    weeks = Math.max(1, Math.ceil(baseWeeks * 1.3)); // 30% more time, minimum 1 week (not 2)
  } else if (prefLower.includes('standard') || prefLower.includes('1-3 months') || prefLower.includes('balanced')) {
    // Standard: normal pace
    weeks = Math.max(1, Math.ceil(baseWeeks * 1.0)); // Normal pace, minimum 1 week
  } else {
    // Default: calculate directly from hours with no artificial minimum
    // Round up to nearest week, but allow fractional weeks for very small projects
    weeks = Math.max(1, Math.ceil(baseWeeks)); // Minimum 1 week for any project
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeks * 7);

  return { weeks, startDate, endDate };
}

export function createEstimate(answers: Answer[], projectName?: string, projectSummary?: string): Estimate {
  const tasks = calculateEstimate(answers, projectName, projectSummary);
  const totalHours = tasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
  
  const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference' || a.questionId === 'timeline-urgency');
  const timelineValue = timelineAnswer?.value as string | undefined;
  const timeline = calculateTimeline(totalHours, timelineValue);

  return {
    tasks,
    totalHours,
    timeline,
  };
}
