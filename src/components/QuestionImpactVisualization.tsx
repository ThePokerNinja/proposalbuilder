import { QuestionImpact } from '../utils/questionImpact';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QuestionImpactVisualizationProps {
  impacts: QuestionImpact[];
  currentQuestionId?: string;
  projectName?: string;
  projectContext?: string;
}

export function QuestionImpactVisualization({ impacts, currentQuestionId }: QuestionImpactVisualizationProps) {
  // Get the absolute base (estimate with no answers) - use context-aware base from impacts
  // The impacts should already have the correct context-aware base hours
  const baseImpact = impacts.find((i) => i.baseHours > 0);
  const absoluteBase = baseImpact?.baseHours || 20; // Default to a reasonable base (e.g., 20h for logo projects)
  
  // Calculate total impact from all answered questions
  const totalImpact = impacts
    .filter((impact) => impact.hasImpact)
    .reduce((sum, impact) => sum + impact.impactHours, 0);
  
  const currentTotal = absoluteBase + totalImpact;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Real-Time Impact</h3>
        <p className="text-sm text-gray-500">
          How each answer affects project hours
        </p>
      </div>

      {/* Total Impact Summary */}
      <div className="mb-6 p-5 bg-blue-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-portfolio-blue mb-2">Current Estimate</p>
            <p className="text-4xl font-bold text-gray-900">
              {Math.round(currentTotal)} hours
            </p>
            {absoluteBase > 0 && (
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Base: {Math.round(absoluteBase)}h
                {totalImpact !== 0 && (
                  <span className={totalImpact > 0 ? 'text-red-600' : 'text-green-600'}>
                    {' '}({totalImpact > 0 ? '+' : ''}{Math.round(totalImpact)}h)
                  </span>
                )}
              </p>
            )}
          </div>
          {totalImpact !== 0 && (
            <div className={`flex items-center ${totalImpact > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalImpact > 0 ? (
                <TrendingUp className="w-6 h-6 mr-2" />
              ) : (
                <TrendingDown className="w-6 h-6 mr-2" />
              )}
              <span className="text-xl font-bold">
                {totalImpact > 0 ? '+' : ''}{Math.round(totalImpact)}h
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question Impacts */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {impacts.map((impact) => {
          const isCurrent = impact.questionId === currentQuestionId;
          const hasImpact = Math.abs(impact.impactHours) > 0.1;
          
          if (!hasImpact && !isCurrent) {
            return null;
          }

          return (
            <div
              key={impact.questionId}
              className={`p-4 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-blue-50 shadow-sm'
                  : hasImpact
                  ? 'bg-gray-50'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs font-medium text-gray-700 mb-1 break-words leading-relaxed">
                    {impact.questionText}
                  </p>
                </div>
                {hasImpact && (
                  <div className={`flex items-center flex-shrink-0 ${
                    impact.impactHours > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {impact.impactHours > 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {impact.impactHours > 0 ? '+' : ''}{Math.round(impact.impactHours)}h
                    </span>
                  </div>
                )}
                {!hasImpact && isCurrent && (
                  <div className="flex items-center flex-shrink-0 text-gray-400">
                    <Minus className="w-4 h-4" />
                  </div>
                )}
              </div>
              
              {/* Detailed Task Breakdown */}
              {hasImpact && impact.taskBreakdown && impact.taskBreakdown.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Impact Breakdown:</p>
                  <div className="space-y-2">
                    {impact.taskBreakdown.map((task, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{task.taskName}</span>
                          <span className={`font-semibold ${task.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {task.change > 0 ? '+' : ''}{Math.round(task.change)}h
                          </span>
                        </div>
                        <div className="text-gray-600">
                          <span className="text-xs">{Math.round(task.baseHours)}h → {Math.round(task.newHours)}h</span>
                          <span className="text-xs italic ml-2">• {task.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Impact Bar */}
              {hasImpact && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        impact.impactHours > 0
                          ? 'bg-red-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(Math.abs(impact.percentageChange), 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {impact.percentageChange > 0 ? '+' : ''}
                    {impact.percentageChange.toFixed(1)}% change
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {impacts.filter((i) => i.hasImpact).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Answer questions to see their impact on the estimate</p>
        </div>
      )}
    </div>
  );
}
