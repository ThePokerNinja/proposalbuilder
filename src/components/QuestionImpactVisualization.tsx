import React from 'react';
import { QuestionImpact } from '../utils/questionImpact';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QuestionImpactVisualizationProps {
  impacts: QuestionImpact[];
  currentQuestionId?: string;
}

export function QuestionImpactVisualization({ impacts, currentQuestionId }: QuestionImpactVisualizationProps) {
  // Get the absolute base (estimate with no answers)
  // Use the first question's base hours as reference, or calculate from empty answers
  const baseImpact = impacts.find((i) => i.baseHours > 0);
  const absoluteBase = baseImpact?.baseHours || 192; // Default base if no answers yet (sum of all base task hours)
  
  // Calculate total impact from all answered questions
  const totalImpact = impacts
    .filter((impact) => impact.hasImpact)
    .reduce((sum, impact) => sum + impact.impactHours, 0);
  
  const currentTotal = absoluteBase + totalImpact;

  return (
    <div className="portfolio-card p-8 border-2 border-gray-200">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Real-Time Impact on Estimate</h3>
        <p className="text-base text-gray-600 font-medium">
          See how each answer affects your project hours
        </p>
      </div>

      {/* Total Impact Summary */}
      <div className="mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-100 shadow-md">
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
              className={`p-4 rounded-lg border-2 transition-all ${
                isCurrent
                  ? 'bg-blue-50 border-portfolio-blue shadow-md'
                  : hasImpact
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1 truncate">
                    {impact.questionText.length > 60
                      ? impact.questionText.substring(0, 60) + '...'
                      : impact.questionText}
                  </p>
                </div>
                {hasImpact && (
                  <div className={`flex items-center ml-2 ${
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
                  <div className="flex items-center ml-2 text-gray-400">
                    <Minus className="w-4 h-4" />
                  </div>
                )}
              </div>
              
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
