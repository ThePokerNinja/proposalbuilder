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
}

// Questions that actually affect the estimate calculation
const QUESTIONS_WITH_IMPACT = [
  'project-type',
  'project-scale',
  'content-status',
  'integration-complexity',
  'revision-expectations',
  'timeline-preference',
];

// Calculate absolute base (estimate with no answers)
let absoluteBaseCache: number | null = null;
function getAbsoluteBase(): number {
  if (absoluteBaseCache === null) {
    const baseTasks = calculateEstimate([]);
    absoluteBaseCache = baseTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
  }
  return absoluteBaseCache;
}

/**
 * Calculate the impact of a single question's answer on total hours
 */
export function calculateQuestionImpact(questionId: string, answer: Answer | null, allAnswers: Answer[]): QuestionImpact {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
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
  
  if (!hasLogicImpact && !answer) {
    return {
      questionId,
      questionText: question.text,
      impactHours: 0,
      baseHours: getAbsoluteBase(),
      percentageChange: 0,
      hasImpact: false,
    };
  }

  // Calculate base estimate (without this question's answer)
  const answersWithoutThis = allAnswers.filter((a) => a.questionId !== questionId);
  const baseTasks = calculateEstimate(answersWithoutThis);
  const baseHours = baseTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);

  // Calculate estimate with this question's answer
  const answersWithThis = answer ? [...answersWithoutThis, answer] : answersWithoutThis;
  const tasksWithThis = calculateEstimate(answersWithThis);
  const hoursWithThis = tasksWithThis.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);

  const impactHours = hoursWithThis - baseHours;
  const absoluteBase = getAbsoluteBase();
  const percentageChange = absoluteBase > 0 ? (impactHours / absoluteBase) * 100 : 0;

  return {
    questionId,
    questionText: question.text,
    impactHours,
    baseHours: absoluteBase, // Use absolute base for consistency
    percentageChange,
    hasImpact: Math.abs(impactHours) > 0.1 || (hasLogicImpact && answer !== null), // Show if has impact or is a question with logic
  };
}

/**
 * Calculate impacts for all questions that have answers or are currently being answered
 */
export function calculateAllQuestionImpacts(answers: Answer[]): QuestionImpact[] {
  return QUESTIONS.map((question) => {
    const answer = answers.find((a) => a.questionId === question.id);
    const impact = calculateQuestionImpact(question.id, answer || null, answers);
    return impact;
  });
}
