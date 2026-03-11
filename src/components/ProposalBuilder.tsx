import React, { useState, useMemo, useEffect } from 'react';
import { Question, Answer, Estimate } from '../types';
import { QUESTIONS } from '../config/questions';
import { createEstimate } from '../utils/estimateEngine';
import { QuestionCard } from './QuestionCard';
import { EstimateVisualization } from './EstimateVisualization';
import { QuestionImpactVisualization } from './QuestionImpactVisualization';
import { LearningInsights } from './LearningInsights';
import { calculateAllQuestionImpacts } from '../utils/questionImpact';
import { 
  analyzeProjectInput, 
  generatePredictions, 
  learnFromProject,
  getLearningData,
  saveLearningData 
} from '../utils/learningEngine';
import { generatePersonalizedQuestions } from '../utils/questionGenerator';
import { ArrowLeft, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export function ProposalBuilder() {
  const [projectName, setProjectName] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [showSummaryField, setShowSummaryField] = useState(false);
  const [hasStartedQuestions, setHasStartedQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [projectAnalysis, setProjectAnalysis] = useState<ReturnType<typeof analyzeProjectInput> | null>(null);
  const [predictions, setPredictions] = useState<Partial<Record<string, string | string[]>>>({});
  const [personalizedQuestions, setPersonalizedQuestions] = useState<Question[]>([]);

  // Generate personalized questions when project name/summary is available
  useEffect(() => {
    if (projectName.trim() || projectContext.trim()) {
      const questions = generatePersonalizedQuestions(projectName, projectContext);
      setPersonalizedQuestions(questions);
    }
  }, [projectName, projectContext]);

  // Use personalized questions if available, otherwise fall back to default
  const questions = personalizedQuestions.length > 0 ? personalizedQuestions : QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);
  const learningData = useMemo(() => getLearningData(), []);

  // Analyze project input when name or context changes
  useEffect(() => {
    if (projectName.trim() && !showSummaryField) {
      // Reveal summary field after a short delay for a subtle staged animation
      const timer = setTimeout(() => setShowSummaryField(true), 250);
      return () => clearTimeout(timer);
    }

    if (projectName.trim() || projectContext.trim()) {
      const analysis = analyzeProjectInput(projectName, projectContext);
      setProjectAnalysis(analysis);
      const preds = generatePredictions(analysis, learningData || undefined);
      setPredictions(preds);
    }
  }, [projectName, projectContext, learningData]);

  // Auto-fill predictions when starting questions
  useEffect(() => {
    if (hasStartedQuestions && Object.keys(predictions).length > 0 && answers.length === 0) {
      const initialAnswers: Answer[] = Object.entries(predictions).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      if (initialAnswers.length > 0) {
        setAnswers(initialAnswers);
      }
    }
  }, [hasStartedQuestions, predictions]);

  // Calculate impacts for visualization
  const questionImpacts = useMemo(() => {
    return calculateAllQuestionImpacts(answers);
  }, [answers]);

  const handleAnswer = (answer: Answer) => {
    const updatedAnswers = answers.filter((a) => a.questionId !== answer.questionId);
    updatedAnswers.push(answer);
    setAnswers(updatedAnswers);
    // No auto-advance - user must click "Next" button to proceed
  };

  const handleStartQuestions = () => {
    if (projectName.trim()) {
      // Generate personalized questions first
      const questions = generatePersonalizedQuestions(projectName, projectContext);
      setPersonalizedQuestions(questions);
      
      // Analyze project and generate initial predictions
      const analysis = analyzeProjectInput(projectName, projectContext);
      setProjectAnalysis(analysis);
      const preds = generatePredictions(analysis, learningData || undefined);
      setPredictions(preds);
      
      // Pre-fill answers based on predictions (mapped to new question IDs)
      if (Object.keys(preds).length > 0) {
        const initialAnswers: Answer[] = Object.entries(preds).map(([questionId, value]) => ({
          questionId,
          value,
        }));
        setAnswers(initialAnswers);
      }
      
      setHasStartedQuestions(true);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      generateEstimate();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const generateEstimate = () => {
    const newEstimate = createEstimate(answers);
    setEstimate(newEstimate);
    setShowEstimate(true);
    
    // Learn from this project to improve future predictions
    if (projectName.trim()) {
      const updatedLearning = learnFromProject(
        projectName,
        projectContext,
        answers,
        learningData || undefined
      );
      saveLearningData(updatedLearning);
    }
  };

  const handleTaskMultiplierChange = (taskId: string, multiplier: number) => {
    if (!estimate) return;

    const updatedTasks = estimate.tasks.map((task) =>
      task.id === taskId ? { ...task, multiplier } : task
    );

    const totalHours = updatedTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
    const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference');
    
    // Recalculate timeline based on new total hours
    const timeline = estimate.timeline; // Keep same timeline structure, or recalculate if needed

    setEstimate({
      ...estimate,
      tasks: updatedTasks,
      totalHours,
      timeline,
    });
  };

  const handleBackToQuestions = () => {
    setShowEstimate(false);
  };

  const progress = hasStartedQuestions 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;
  const allQuestionsAnswered = answers.length === questions.length;

  // Project setup screen (before questions)
  if (!hasStartedQuestions) {
    return (
      <div className="min-h-screen portfolio-bg py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/assets/logo.png" 
              alt="Logo" 
              className="h-20 w-20 object-contain drop-shadow-lg"
              onError={(e) => {
                // Fallback if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Proposal Builder
            </h1>
            <p className="text-xl text-white/90 font-light">
              Let's start by naming your project
            </p>
          </div>

          <div className="portfolio-card p-8 md:p-10 space-y-8">
            {/* Project Name */}
            <div className="transition-all duration-500 ease-out transform opacity-100 translate-y-0">
              <label htmlFor="project-name" className="block text-sm font-semibold text-gray-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., E-commerce Website Redesign"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Project Summary – animates in after name */}
            <div
              className={`transition-all duration-500 ease-out transform origin-top ${
                showSummaryField
                  ? 'opacity-100 translate-y-0 max-h-[1000px]'
                  : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden pointer-events-none'
              }`}
            >
              <label htmlFor="project-context" className="block text-sm font-semibold text-gray-700 mb-2">
                Project Summary <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                {projectAnalysis && (
                  <span className="ml-2 text-xs text-portfolio-blue font-medium">
                    • AI analysis active
                  </span>
                )}
              </label>
              <textarea
                id="project-context"
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="Provide a summary of your project, goals, or requirements... The more details you share, the more accurate our AI-powered assessment will be."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                This helps our AI learning system better understand and anticipate your project needs
              </p>
              {projectAnalysis && Object.keys(predictions).length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">AI Insights:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {projectAnalysis.projectType && (
                      <li>• Detected project type: <span className="font-medium">{projectAnalysis.projectType}</span></li>
                    )}
                    {projectAnalysis.complexity && (
                      <li>• Complexity level: <span className="font-medium">{projectAnalysis.complexity}</span></li>
                    )}
                    {projectAnalysis.industry && (
                      <li>• Industry: <span className="font-medium">{projectAnalysis.industry}</span></li>
                    )}
                    {projectAnalysis.features.length > 0 && (
                      <li>• Features detected: <span className="font-medium">{projectAnalysis.features.join(', ')}</span></li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={handleStartQuestions}
              disabled={!projectName.trim()}
              className="w-full flex items-center justify-center px-8 py-4 bg-[#FFD700] text-black border-2 border-[#FFD700] rounded-lg font-semibold text-lg hover:bg-[#FFC700] hover:border-[#FFC700] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300 transition-all shadow-lg hover:shadow-xl"
            >
              Begin Project Visualization
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showEstimate && estimate) {
    return (
      <div className="min-h-screen portfolio-bg py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/assets/logo.png" 
              alt="Logo" 
              className="h-20 w-20 object-contain drop-shadow-lg"
              onError={(e) => {
                // Fallback if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <button
            onClick={handleBackToQuestions}
            className="mb-6 flex items-center text-white/90 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Questions
          </button>
          <EstimateVisualization
            tasks={estimate.tasks}
            totalHours={estimate.totalHours}
            timeline={estimate.timeline}
            onTaskMultiplierChange={handleTaskMultiplierChange}
            onTasksChange={(updatedTasks) => {
              // Update estimate with new task selections
              const newTotalHours = updatedTasks
                .filter((t) => t.selected !== false)
                .reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
              
              setEstimate({
                ...estimate,
                tasks: updatedTasks,
                totalHours: newTotalHours,
              });
            }}
            projectName={projectName}
            projectSummary={projectContext}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen portfolio-bg py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Main Question Area */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <div className="flex justify-start mb-8">
              <img 
                src="/assets/logo.png" 
                alt="Logo" 
                className="h-16 w-16 object-contain"
                onError={(e) => {
                  // Fallback if logo not found
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Header */}
            <div className="text-left mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Proposal Builder
              </h1>
              <p className="text-lg text-white/90 mb-4 font-light">
                Answer a few strategic questions to get a transparent project estimate
              </p>
              {projectAnalysis && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-sm text-white/90 font-medium">
                    AI-powered personalization active
                  </span>
                </div>
              )}
              <div className="w-full bg-white/20 rounded-full h-3 max-w-md backdrop-blur-sm mt-4">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300 shadow-lg"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-white/80 mt-3 font-medium">
                {currentQuestionIndex + 1} of {questions.length} questions
              </p>
            </div>

            {/* AI Indicator */}
            {personalizedQuestions.length > 0 && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <Sparkles className="w-4 h-4 text-portfolio-blue animate-pulse" />
                <p className="text-sm text-gray-700 font-medium">
                  AI-powered personalized questions based on <span className="font-semibold text-portfolio-blue">"{projectName}"</span>
                </p>
              </div>
            )}

            {/* Question Card */}
            {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer || null}
            allAnswers={answers}
            onAnswer={handleAnswer}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            prediction={predictions[currentQuestion.id]}
            hasPrediction={!!predictions[currentQuestion.id]}
          />
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center px-4 py-2 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Previous
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={generateEstimate}
                  disabled={!allQuestionsAnswered}
                  className="flex items-center px-8 py-4 bg-white text-portfolio-blue rounded-lg font-semibold text-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  Generate Estimate
                  <CheckCircle className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                  className="px-8 py-4 bg-white text-portfolio-blue rounded-lg font-semibold text-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Right Column (1/3): Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Learning Insights */}
            <div>
              <LearningInsights />
            </div>

            {/* Impact Visualization */}
            <div>
              <QuestionImpactVisualization
                impacts={questionImpacts}
                currentQuestionId={currentQuestion?.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
