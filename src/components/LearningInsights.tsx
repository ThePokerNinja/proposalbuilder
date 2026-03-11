import React from 'react';
import { getLearningData } from '../utils/learningEngine';
import { TrendingUp, Database } from 'lucide-react';

export function LearningInsights() {
  const learningData = getLearningData();
  
  if (!learningData || learningData.patterns.length === 0) {
    return null;
  }

  const totalProjects = learningData.patterns.reduce((sum, p) => sum + p.occurrences, 0);
  const avgConfidence = learningData.patterns.reduce((sum, p) => sum + p.confidence, 0) / learningData.patterns.length;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-md mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-portfolio-blue" />
          <h3 className="text-lg font-bold text-gray-900">AI Learning System</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp className="w-4 h-4" />
          <span className="font-medium">{Math.round(avgConfidence * 100)}% accuracy</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600 font-medium">Patterns Learned</p>
          <p className="text-2xl font-bold text-portfolio-blue">{learningData.patterns.length}</p>
        </div>
        <div>
          <p className="text-gray-600 font-medium">Projects Analyzed</p>
          <p className="text-2xl font-bold text-portfolio-blue">{totalProjects}</p>
        </div>
        <div>
          <p className="text-gray-600 font-medium">System Version</p>
          <p className="text-2xl font-bold text-portfolio-blue">v{learningData.version}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4 italic">
        The system learns from each project to improve prediction accuracy over time
      </p>
    </div>
  );
}
