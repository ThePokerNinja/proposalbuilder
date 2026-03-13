import React from 'react';
import { Question, Answer } from '../types';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { calculateQuestionImpact, QuestionImpact } from '../utils/questionImpact';

interface QuestionCardProps {
  question: Question;
  answer: Answer | null;
  allAnswers: Answer[];
  onAnswer: (answer: Answer) => void;
  questionNumber: number;
  totalQuestions: number;
  projectName?: string;
  projectSummary?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack?: boolean;
  isLastQuestion?: boolean;
  canContinue?: boolean;
}

export function QuestionCard({
  question,
  answer,
  allAnswers,
  onAnswer,
  questionNumber,
  totalQuestions,
  projectName,
  projectSummary,
  onPrevious,
  onNext,
  canGoBack = false,
  isLastQuestion = false,
  canContinue = false,
}: QuestionCardProps) {
  // Initialize textInput from existing answer if available
  const [textInput, setTextInput] = React.useState<string>(() => {
    if (question.type === 'text' && answer && typeof answer.value === 'string') {
      return answer.value;
    }
    return '';
  });
  const [hoverImpact, setHoverImpact] = React.useState<{ option: string; impact: QuestionImpact } | null>(null);

  // Update textInput when answer changes
  React.useEffect(() => {
    if (question.type === 'text' && answer && typeof answer.value === 'string') {
      setTextInput(answer.value);
    }
  }, [answer, question.type]);

  const handleSelectChange = (value: string) => {
    if (question.type === 'multi-select') {
      const currentValues = Array.isArray(answer?.value) ? (answer.value as string[]) : [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      onAnswer({ questionId: question.id, value: newValues });
    } else {
      onAnswer({ questionId: question.id, value });
    }
  };

  const handleTextChange = (value: string) => {
    setTextInput(value);
    // Update answer in real-time as user types (preserve spaces)
    onAnswer({ questionId: question.id, value });
  };

  return (
    <div className="relative group">
      {/* Gradient border effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
      <div className="relative bg-white rounded-2xl p-10 md:p-12 max-w-2xl mx-auto shadow-2xl border border-gray-100">
        {/* Enhanced header */}
        <div className="mb-8 flex items-center flex-wrap gap-3 pb-6 border-b-2 border-gray-100">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <span className="text-sm font-bold text-portfolio-blue">
              Question {questionNumber}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-600 font-medium">{totalQuestions}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-700 capitalize font-semibold bg-gray-100 px-3 py-1.5 rounded-lg">{question.category}</span>
          <span className="text-gray-300">•</span>
          <span className={`text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm ${
            question.type === 'multi-select'
              ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300'
              : question.type === 'select'
              ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300'
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
          }`}>
            {question.type === 'multi-select' ? 'Multiple Selection' : question.type === 'select' ? 'Single Selection' : 'Text Input'}
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 leading-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">{question.text}</h2>
      </div>

      {question.type === 'text' && (
        <div className="space-y-4">
          <textarea
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-6 py-5 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white resize-none text-gray-900 placeholder:text-gray-400 leading-relaxed shadow-sm"
            rows={5}
          />
        </div>
      )}

      {question.type === 'select' && (
        <div className="space-y-4">
          {question.options?.map((option) => {
            const isSelected = answer?.value === option;

            return (
              <button
                key={option}
                onClick={() => handleSelectChange(option)}
                onMouseEnter={() => {
                  const previewAnswer: Answer = { questionId: question.id, value: option };
                  const impact = calculateQuestionImpact(question.id, previewAnswer, allAnswers, question.text, projectName, projectSummary);
                  setHoverImpact({ option, impact });
                }}
                onMouseLeave={() => setHoverImpact(null)}
                className={`w-full text-left px-6 py-5 rounded-xl border-2 transition-all duration-200 font-semibold text-base flex items-center justify-between gap-4 group ${
                  isSelected
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 text-portfolio-blue shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50 text-gray-900 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <span>{option}</span>
                {hoverImpact && hoverImpact.option === option && hoverImpact.impact.hasImpact && (
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                      hoverImpact.impact.impactHours > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {hoverImpact.impact.impactHours > 0
                      ? `Adds ${Math.round(hoverImpact.impact.impactHours)}h`
                      : `Saves ${Math.abs(Math.round(hoverImpact.impact.impactHours))}h`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'multi-select' && (
        <div className="space-y-4">
          {question.options?.map((option) => {
            const isSelected = Array.isArray(answer?.value) && (answer.value as string[]).includes(option);
            return (
              <button
                key={option}
                onClick={() => handleSelectChange(option)}
                onMouseEnter={() => {
                  const currentValues = Array.isArray(answer?.value) ? (answer.value as string[]) : [];
                  const newValues = isSelected
                    ? currentValues.filter((v) => v !== option)
                    : [...currentValues, option];
                  const previewAnswer: Answer = { questionId: question.id, value: newValues };
                  const impact = calculateQuestionImpact(question.id, previewAnswer, allAnswers, question.text, projectName, projectSummary);
                  setHoverImpact({ option, impact });
                }}
                onMouseLeave={() => setHoverImpact(null)}
                className={`w-full text-left px-6 py-5 rounded-xl border-2 transition-all duration-200 font-semibold text-base flex items-center justify-between gap-4 group ${
                  isSelected
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50 text-gray-900 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <span className="flex items-center flex-1 min-w-0">
                  <span
                    className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-portfolio-blue bg-portfolio-blue'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  {option}
                </span>
                {hoverImpact && hoverImpact.option === option && hoverImpact.impact.hasImpact && (
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                      hoverImpact.impact.impactHours > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {hoverImpact.impact.impactHours > 0
                      ? `Adds ${Math.round(hoverImpact.impact.impactHours)}h`
                      : `Saves ${Math.abs(Math.round(hoverImpact.impact.impactHours))}h`}
                  </span>
                )}
              </button>
            );
          })}
          {Array.isArray(answer?.value) && (answer.value as string[]).length > 0 && (
            <button
              onClick={() => onAnswer({ questionId: question.id, value: [] })}
              className="mt-4 text-sm text-portfolio-blue hover:text-portfolio-blue-dark font-medium"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Inline navigation footer inside the card */}
      {onNext && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoBack || !onPrevious}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-portfolio-blue font-semibold text-sm shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastQuestion ? (
              <>
                Generate estimate
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
