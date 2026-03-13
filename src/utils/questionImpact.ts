import { Answer, Question } from '../types';
import { QUESTIONS } from '../config/questions';
import { calculateEstimate } from './estimateEngine';

export interface QuestionImpact {
  questionId: string;
  questionText: string;
  impactHours: number;
  baseHours: number;
  percentageChange: number;
  hasImpact: boolean;
  taskBreakdown?: Array<{ taskName: string; taskId: string; baseHours: number; newHours: number; change: number; reason: string }>;
}

// Questions that actually affect the estimate calculation (both old and new question IDs)
const QUESTIONS_WITH_IMPACT = [
  'project-type',
  'project-scale',
  'content-status',
  'content-strategy',
  'brand-assets',
  'integration-complexity',
  'technical-requirements',
  'revision-expectations',
  'timeline-preference',
  'timeline-urgency',
  'project-scope',
  'current-state',
  'business-value',
  'investment-clarity',
];

// Calculate absolute base (estimate with no answers) - now context-aware
let absoluteBaseCache: Map<string, number> = new Map();
function getAbsoluteBase(projectName?: string, projectSummary?: string): number {
  const cacheKey = `${projectName || ''}_${projectSummary || ''}`;
  
  if (!absoluteBaseCache.has(cacheKey)) {
    const baseTasks = calculateEstimate([], projectName, projectSummary);
    const baseHours = baseTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
    absoluteBaseCache.set(cacheKey, baseHours);
  }
  
  return absoluteBaseCache.get(cacheKey) || 0;
}

/**
 * Calculate the impact of a single question's answer on total hours
 * Now context-aware - uses project context to calculate accurate base hours
 */
export function calculateQuestionImpact(
  questionId: string, 
  answer: Answer | null, 
  allAnswers: Answer[], 
  questionText?: string,
  projectName?: string,
  projectSummary?: string
): QuestionImpact {
  // Try to find question in QUESTIONS array, or use provided text
  const question = QUESTIONS.find((q) => q.id === questionId);
  const displayText = question?.text || questionText || '';
  
  if (!question && !questionText) {
    return {
      questionId,
      questionText: '',
      impactHours: 0,
      baseHours: 0,
      percentageChange: 0,
      hasImpact: false,
    };
  }

  // Only calculate impact for questions that affect the estimate
  const hasLogicImpact = QUESTIONS_WITH_IMPACT.includes(questionId);
  
  // Get context-aware base hours
  const absoluteBase = getAbsoluteBase(projectName, projectSummary);
  
  if (!hasLogicImpact && !answer) {
    return {
      questionId,
      questionText: displayText,
      impactHours: 0,
      baseHours: absoluteBase,
      percentageChange: 0,
      hasImpact: false,
    };
  }

  // Calculate base estimate (without this question's answer) - using context
  const answersWithoutThis = allAnswers.filter((a) => a.questionId !== questionId);
  const baseTasks = calculateEstimate(answersWithoutThis, projectName, projectSummary);
  const baseHours = baseTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);

  // Calculate estimate with this question's answer - using context
  const answersWithThis = answer ? [...answersWithoutThis, answer] : answersWithoutThis;
  const tasksWithThis = calculateEstimate(answersWithThis, projectName, projectSummary);
  const hoursWithThis = tasksWithThis.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);

  const impactHours = hoursWithThis - baseHours;
  const percentageChange = absoluteBase > 0 ? (impactHours / absoluteBase) * 100 : 0;

  // Generate detailed task breakdown showing which tasks changed and why
  const taskBreakdown: Array<{ taskName: string; taskId: string; baseHours: number; newHours: number; change: number; reason: string }> = [];
  
  if (hasLogicImpact && answer) {
    // Compare tasks before and after to see what changed
    const taskMap = new Map(baseTasks.map(t => [t.id, t]));
    
    tasksWithThis.forEach(newTask => {
      const oldTask = taskMap.get(newTask.id);
      if (oldTask) {
        const oldHours = oldTask.baseHours * oldTask.multiplier;
        const newHours = newTask.baseHours * newTask.multiplier;
        const change = newHours - oldHours;
        
        if (Math.abs(change) > 0.1) {
          // Determine reason based on question and answer
          let reason = '';
          const answerValue = typeof answer.value === 'string' ? answer.value : Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value);
          
          if (questionId === 'project-scope') {
            if (answerValue.includes('Complete') || answerValue.includes('Full') || answerValue.includes('Comprehensive')) {
              reason = `Comprehensive scope requires more ${newTask.category.toLowerCase()} work`;
            } else if (answerValue.includes('Focused') || answerValue.includes('Small')) {
              reason = `Focused scope reduces ${newTask.category.toLowerCase()} requirements`;
            }
          } else if (questionId === 'current-state') {
            if (answerValue.includes('Starting from scratch')) {
              reason = `Building from scratch requires additional ${newTask.category.toLowerCase()} planning`;
            } else if (answerValue.includes('overhaul')) {
              reason = `Complete overhaul increases ${newTask.category.toLowerCase()} complexity`;
            }
          } else if (questionId === 'timeline-urgency' || questionId === 'timeline-preference') {
            if (answerValue.includes('Time-sensitive') || answerValue.includes('Rush')) {
              reason = `Rush timeline requires parallel work, increasing ${newTask.category.toLowerCase()} hours`;
            }
          } else if (questionId === 'content-strategy' || questionId === 'content-status') {
            if (answerValue.includes('Need content') || answerValue.includes('Starting from scratch')) {
              reason = `Content creation needed increases ${newTask.category.toLowerCase()} work`;
            }
          } else if (questionId === 'technical-requirements') {
            reason = `Additional technical requirements increase ${newTask.category.toLowerCase()} complexity`;
          } else if (questionId === 'business-value') {
            if (Array.isArray(answer.value) && answer.value.length > 3) {
              reason = `Multiple business goals require more comprehensive ${newTask.category.toLowerCase()} solution`;
            }
          } else if (questionId === 'investment-clarity') {
            if (answerValue.includes('$75,000+') || answerValue.includes('Enterprise')) {
              reason = `Higher investment allows for more comprehensive ${newTask.category.toLowerCase()} work`;
            } else if (answerValue.includes('Under $15,000')) {
              reason = `Budget constraints require streamlined ${newTask.category.toLowerCase()} approach`;
            }
          } else {
            reason = `Answer affects ${newTask.category.toLowerCase()} scope`;
          }
          
          taskBreakdown.push({
            taskName: newTask.name,
            taskId: newTask.id,
            baseHours: oldHours,
            newHours: newHours,
            change: change,
            reason: reason || `Answer affects ${newTask.category.toLowerCase()} scope`
          });
        }
      }
    });
  }

  return {
    questionId,
    questionText: displayText,
    impactHours,
    baseHours: absoluteBase, // Use context-aware absolute base
    percentageChange,
    hasImpact: Math.abs(impactHours) > 0.1 || (hasLogicImpact && answer !== null), // Show if has impact or is a question with logic
    taskBreakdown: taskBreakdown.length > 0 ? taskBreakdown : undefined,
  };
}

/**
 * Calculate impacts for all questions that have answers or are currently being answered
 * Now context-aware
 */
export function calculateAllQuestionImpacts(
  answers: Answer[], 
  projectName?: string, 
  projectSummary?: string,
  questions?: Question[]
): QuestionImpact[] {
  const questionsToUse = questions || QUESTIONS;
  return questionsToUse.map((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    const impact = calculateQuestionImpact(question.id, answer || null, answers, question.text, projectName, projectSummary);
    return impact;
  });
}
