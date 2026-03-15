import { useState, useMemo, useEffect, useRef } from 'react';
import { Question, Answer, Estimate } from '../types';
import { QUESTIONS } from '../config/questions';
import { createEstimate, calculateTimeline } from '../utils/estimateEngine';
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
import { runMarketResearch, MarketResearchResult } from '../utils/marketResearch';
import { generatePersonalizedQuestions } from '../utils/questionGenerator';
import { VoiceInput } from './VoiceInput';
import { ProgressiveCard } from './ProgressiveCard';
import { VersionManager } from './VersionManager';
import { ArrowLeft, ArrowRight, Sparkles, X, AlertTriangle } from 'lucide-react';

const TAGLINE_MESSAGES = [
  'A Voice Enabled AI-Powered Planning Partner',
  'Click to Get Started',
];

export function ProposalBuilder() {
  const [projectName, setProjectName] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState('branding package');
  const [projectPriority, setProjectPriority] = useState<'urgent' | 'within-month' | 'no-rush'>('within-month');
  const [showSummaryField, setShowSummaryField] = useState(false);
  // Flow: 'intro' -> 'research' -> 'questions' (estimate handled separately)
  const [flowStep, setFlowStep] = useState<'intro' | 'research' | 'questions'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const [_projectAnalysis, setProjectAnalysis] = useState<ReturnType<typeof analyzeProjectInput> | null>(null);
  const [_predictions, setPredictions] = useState<Partial<Record<string, string | string[]>>>({});
  const [personalizedQuestions, setPersonalizedQuestions] = useState<Question[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [_isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketResearch, setMarketResearch] = useState<MarketResearchResult | null>(null);
  const [agentTranscriptHistory, setAgentTranscriptHistory] = useState<string[]>([]);
  const analysisTimeoutRef = useRef<number | null>(null);
  const [taglineMessageIndex, setTaglineMessageIndex] = useState(0);
  const [typedTagline, setTypedTagline] = useState('');

  // Generate personalized questions when project name/summary is available
  // Update questions dynamically as answers come in to filter irrelevant ones
  useEffect(() => {
    if (projectName.trim() || projectContext.trim()) {
      const questions = generatePersonalizedQuestions(projectName, projectContext, answers);
      setPersonalizedQuestions(questions);
    }
  }, [projectName, projectContext, answers]);

  // Use personalized questions if available, otherwise fall back to default
  const questions = personalizedQuestions.length > 0 ? personalizedQuestions : QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);
  const learningData = useMemo(() => getLearningData(), []);

  // High-level context we can stream to the voice agent so it always knows
  // where the user is in the flow and what the current proposal looks like.
  const agentContext = useMemo(() => ({
    flowStep,
    pageTitle:
      flowStep === 'intro'
        ? 'Project Overview'
        : flowStep === 'research'
        ? 'Market Research'
        : flowStep === 'questions'
        ? 'Discovery Questions'
        : 'Proposal Builder',
    projectName,
    projectSummary: projectContext,
    jobTitle,
    projectCategory,
    projectPriority,
    questions: {
      total: questions.length,
      currentIndex: currentQuestionIndex + 1,
      currentId: currentQuestion?.id ?? null,
      currentText: currentQuestion?.text ?? null,
    },
    answersSummary: answers.map((a) => ({
      id: a.questionId,
      value: a.value,
    })),
    estimateSummary: estimate
      ? {
          totalHours: estimate.totalHours,
          timelineWeeks: estimate.timeline.weeks,
        }
      : null,
    showEstimate,
  }), [flowStep, projectName, projectContext, jobTitle, projectCategory, projectPriority, questions.length, currentQuestionIndex, currentQuestion, answers, estimate, showEstimate]);

  // Sticky top bar with voice agent + animated tagline
  const TopBar = () => (
    <div className="sticky top-0 z-40 -mx-4 px-4 pt-4 pb-3 bg-gradient-to-b from-[#020617]/95 via-[#020617]/90 to-transparent backdrop-blur-xl border-b border-white/10 pointer-events-auto">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
        <VoiceInput
          onFormDataUpdate={handleVoiceFormDataUpdate}
          onTranscript={(text) => {
            setAgentTranscriptHistory(prev => [...prev, text]);
          }}
          onError={(error) => {
            console.error('Voice input error:', error);
          }}
          agentContext={agentContext}
        />
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/80 text-[10px] font-medium tracking-wide">
          <Sparkles className="w-3 h-3 text-[#FFD700]" />
          <span className="whitespace-nowrap">
            {typedTagline || TAGLINE_MESSAGES[taglineMessageIndex]}
          </span>
        </span>
      </div>
    </div>
  );

  // Analyze project input when key fields change (debounced) so AI Insights feel responsive
  useEffect(() => {
    if (projectName.trim() && !showSummaryField) {
      // Reveal summary field after a short delay for a subtle staged animation
      const timer = setTimeout(() => setShowSummaryField(true), 250);
      return () => clearTimeout(timer);
    }

    // If there is no meaningful input, clear insights
    if (!(projectName.trim() || projectContext.trim() || jobTitle.trim())) {
      setProjectAnalysis(null);
      setPredictions({});
      setIsAnalyzing(false);
      if (analysisTimeoutRef.current !== null) {
        window.clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
      return;
    }

    // User is typing: show "thinking..." immediately
    setIsAnalyzing(true);

    // Debounce the heavy analysis so it runs after the user pauses
    if (analysisTimeoutRef.current !== null) {
      window.clearTimeout(analysisTimeoutRef.current);
    }

    const timeoutId = window.setTimeout(() => {
      const priorityLabel =
        projectPriority === 'urgent'
          ? 'urgent'
          : projectPriority === 'within-month'
          ? 'within the month'
          : 'no rush';

      const enrichedContext = [
        projectContext,
        jobTitle ? `Job title: ${jobTitle}.` : '',
        `Project category: ${projectCategory}.`,
        `Priority: ${priorityLabel}.`,
      ]
        .filter(Boolean)
        .join(' ');

      const analysis = analyzeProjectInput(projectName, enrichedContext);
      setProjectAnalysis(analysis);
      const preds = generatePredictions(analysis, learningData || undefined);
      setPredictions(preds);
      setIsAnalyzing(false);
      analysisTimeoutRef.current = null;
    }, 500); // 500ms pause before committing analysis

    analysisTimeoutRef.current = timeoutId;

    return () => {
      if (analysisTimeoutRef.current !== null) {
        window.clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [projectName, projectContext, jobTitle, projectCategory, projectPriority, learningData, showSummaryField]);

  // (Predictions are applied when starting the flow in handleStartQuestions)

  // Calculate impacts for visualization - now context-aware
  const questionImpacts = useMemo(() => {
    return calculateAllQuestionImpacts(answers, projectName, projectContext, questions);
  }, [answers, projectName, projectContext, questions]);

  const handleAnswer = (answer: Answer) => {
    const updatedAnswers = answers.filter((a) => a.questionId !== answer.questionId);
    updatedAnswers.push(answer);
    setAnswers(updatedAnswers);
    // No auto-advance - user must click "Next" button to proceed
  };

  // Kept for revert - unused in current flow
  const _handleStartQuestions = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    // ALWAYS set placeholder research data FIRST to prevent white screen
    setMarketResearch({
      marketSummary: 'Preparing market analysis...',
      competitiveLandscape: 'Evaluating competitive landscape...',
      bestPractices: 'Analyzing best practices...',
      strategicRecommendations: 'Generating strategic recommendations...',
      metrics: {
        competitiveIntensity: 70,
        differentiationOpportunity: 30,
        uxElevationNeeded: 75,
        timelinePressure: 60,
      },
    });

    // ALWAYS move to research step FIRST - this must happen immediately
    setFlowStep('research');

    // Then do async work in the background
    try {
      // Generate personalized questions and initial predictions as before
      const questions = generatePersonalizedQuestions(projectName, projectContext);
      setPersonalizedQuestions(questions);

      const analysis = analyzeProjectInput(projectName, projectContext);
      setProjectAnalysis(analysis);
      const preds = generatePredictions(analysis, learningData || undefined);
      setPredictions(preds);
    } catch (error) {
      console.error('Error in handleStartQuestions:', error);
      // Don't block the flow on errors
    }
  };
  void _handleStartQuestions; // Kept for revert

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

  const generateEstimate = (): Estimate | null => {
    const newEstimate = createEstimate(answers, projectName, projectContext);
    setEstimate(newEstimate);
    // Don't set showEstimate - let ProgressiveCard handle the layout with both cards and estimate
    
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
    
    return newEstimate;
  };

  const handleTaskMultiplierChange = (taskId: string, multiplier: number) => {
    if (!estimate) return;

    const updatedTasks = estimate.tasks.map((task) =>
      task.id === taskId ? { ...task, multiplier } : task
    );

    const totalHours = updatedTasks.reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
    
    // Recalculate timeline based on new total hours
    const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference' || a.questionId === 'timeline-urgency');
    const timelineValue = timelineAnswer?.value as string | undefined;
    const timeline = calculateTimeline(totalHours, timelineValue);

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

  // Back behavior from question card:
  // - On first question, go back to Step 2 (research)
  // - Otherwise, go to previous question
  const handleQuestionBack = () => {
    if (currentQuestionIndex === 0) {
      setFlowStep('research');
    } else {
      handlePrevious();
    }
  };

  // Check if form is complete (all required fields filled) - Kept for revert
  const _isFormComplete = useMemo(() => {
    return !!(
      jobTitle.trim() &&
      projectCategory.trim() &&
      projectPriority &&
      projectName.trim() &&
      projectContext.trim()
    );
  }, [jobTitle, projectCategory, projectPriority, projectName, projectContext]);
  void _isFormComplete; // Kept for revert

  // Handle voice input form data updates
  const handleVoiceFormDataUpdate = (data: {
    jobTitle?: string;
    projectCategory?: string;
    projectPriority?: 'urgent' | 'within-month' | 'no-rush';
    projectName?: string;
    projectSummary?: string;
  }) => {
    // Update fields immediately as they come in
    if (data.jobTitle) setJobTitle(data.jobTitle);
    if (data.projectCategory) setProjectCategory(data.projectCategory);
    if (data.projectPriority) setProjectPriority(data.projectPriority);
    if (data.projectName) setProjectName(data.projectName);
    if (data.projectSummary) setProjectContext(data.projectSummary);
  };

  const handleResetToStart = () => {
    // Reset all state to initial values
    setProjectName('');
    setProjectContext('');
    setShowSummaryField(false);
    setFlowStep('intro');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setEstimate(null);
    setShowEstimate(false);
    setProjectAnalysis(null);
    setPredictions({});
    setPersonalizedQuestions([]);
    setShowResetModal(false);
  };


  const progress = flowStep === 'questions' 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;
  // Check if all questions are answered (accounting for text questions which might be empty)

  // Run market research when Step 2 is active and inputs change
  useEffect(() => {
    if (flowStep === 'research') {
      // Immediately set placeholder data to prevent white screen
      if (!marketResearch) {
        setMarketResearch({
          marketSummary: 'Preparing market analysis...',
          competitiveLandscape: 'Evaluating competitive landscape...',
          bestPractices: 'Analyzing best practices...',
          strategicRecommendations: 'Generating strategic recommendations...',
          metrics: {
            competitiveIntensity: 70,
            differentiationOpportunity: 30,
            uxElevationNeeded: 75,
            timelinePressure: 60,
          },
        });
      }

      if (projectName.trim()) {
        const priorityLabel =
          projectPriority === 'urgent'
            ? 'urgent'
            : projectPriority === 'within-month'
            ? 'within the month'
            : 'no rush';
        
        // Small delay to show "thinking" state
        const timer = setTimeout(() => {
          try {
            const result = runMarketResearch(projectName, projectContext, projectCategory, priorityLabel, jobTitle);
            setMarketResearch(result);
          } catch (error) {
            console.error('Error running market research:', error);
            // Set a fallback result to prevent white screen
            setMarketResearch({
              marketSummary: 'Market analysis is being prepared...',
              competitiveLandscape: 'Competitive landscape evaluation in progress...',
              bestPractices: 'Best practices analysis underway...',
              strategicRecommendations: 'Strategic recommendations being generated...',
              metrics: {
                competitiveIntensity: 70,
                differentiationOpportunity: 30,
                uxElevationNeeded: 75,
                timelinePressure: 60,
              },
            });
          }
        }, 300);
        
        return () => clearTimeout(timer);
      } else {
        // No project name - show placeholder
        setMarketResearch({
          marketSummary: 'Please provide a project name to begin market analysis.',
          competitiveLandscape: 'Competitive analysis will be generated based on your project details.',
          bestPractices: 'Best practices will be tailored to your specific project category.',
          strategicRecommendations: 'Strategic recommendations will be provided once project details are available.',
          metrics: {
            competitiveIntensity: 70,
            differentiationOpportunity: 30,
            uxElevationNeeded: 75,
            timelinePressure: 60,
          },
        });
      }
    }
  }, [flowStep, projectName, projectContext, projectCategory, projectPriority, jobTitle]);

  // Listen for estimate shortcut button click - works from anywhere in the process
  useEffect(() => {
    const handleShowEstimate = () => {
      // Always generate estimate if it doesn't exist (works even with empty/minimal data)
      if (!estimate) {
        // Generate estimate with current answers (createEstimate always returns an estimate)
        const newEstimate = createEstimate(answers, projectName || 'Project', projectContext || '');
        setEstimate(newEstimate);
      }
      
      // Always navigate to estimate screen, regardless of current flowStep
      // The showEstimate check happens before flowStep checks in the render logic
      setShowEstimate(true);
    };

    window.addEventListener('proposalbuilder:show-estimate', handleShowEstimate);
    return () => {
      window.removeEventListener('proposalbuilder:show-estimate', handleShowEstimate);
    };
  }, [estimate, answers, projectName, projectContext]);

  // Typewriter effect for tagline, cycling between two messages
  useEffect(() => {
    const fullText = TAGLINE_MESSAGES[taglineMessageIndex];

    // Still typing current message
    if (typedTagline.length < fullText.length) {
      const id = window.setTimeout(() => {
        setTypedTagline(fullText.slice(0, typedTagline.length + 1));
      }, 45); // typing speed
      return () => window.clearTimeout(id);
    }

    // Message complete – wait, then switch to next
    const pauseId = window.setTimeout(() => {
      const nextIndex = (taglineMessageIndex + 1) % TAGLINE_MESSAGES.length;
      setTaglineMessageIndex(nextIndex);
      setTypedTagline('');
    }, 2200);

    return () => window.clearTimeout(pauseId);
  }, [typedTagline, taglineMessageIndex]);

  // REMOVED: Separate estimate screen - ProgressiveCard now handles showing both cards and estimate together in a two-column layout

  // Toggle tagline text every 4 seconds
  // Project setup screen (Step 1)
  if (flowStep === 'intro') {
    return (
      <>
      <div className="portfolio-bg pb-24 px-4 relative" style={{ marginLeft: '-500px', marginRight: '-500px', paddingLeft: '500px', paddingRight: '500px', minHeight: '100vh' }}>
        <TopBar />

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-32 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-white/70 text-sm" style={{ height: '40px' }}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Real-time estimates • Industry-standard rates • AI-powered insights</span>
        </div>
        
        <div className={`${estimate ? 'max-w-full' : 'max-w-3xl'} mx-auto relative z-10 mt-6`}>
          {/* NEW PROGRESSIVE CARD - Replaces old multi-step flow */}
          <ProgressiveCard
            jobTitle={jobTitle}
            projectCategory={projectCategory}
            projectPriority={projectPriority}
            projectName={projectName}
            projectContext={projectContext}
            setJobTitle={setJobTitle}
            setProjectCategory={setProjectCategory}
            setProjectPriority={setProjectPriority}
            setProjectName={setProjectName}
            setProjectContext={setProjectContext}
            questions={questions}
            answers={answers}
            setAnswers={setAnswers}
            marketResearch={marketResearch}
            estimate={estimate}
            setEstimate={setEstimate}
            onTaskMultiplierChange={handleTaskMultiplierChange}
            onRunResearch={() => {
              // Trigger research when moving from last basic field to research step
              if (projectName.trim()) {
                const priorityLabel = projectPriority === 'urgent' ? 'Urgent' : 
                                     projectPriority === 'within-month' ? 'Within the month' : 
                                     projectPriority === 'no-rush' ? 'No rush' : '';
                const result = runMarketResearch(projectName, projectContext, projectCategory, priorityLabel, jobTitle);
                setMarketResearch(result);
                
                // Generate personalized questions after research
                const questions = generatePersonalizedQuestions(projectName, projectContext);
                setPersonalizedQuestions(questions);
              }
            }}
            onGenerateEstimate={generateEstimate}
            onVoiceUpdate={handleVoiceFormDataUpdate}
          />


          {/* OLD CARD CODE - PRESERVED FOR REVERT
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFD700] via-blue-400 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-4 md:px-5 md:py-4 space-y-4 shadow-2xl border border-white/20">
            Top row: job title / project category / priority
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              Job title
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  What do you do?
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Senior Producer, Marketing Lead"
                  className="w-full px-2.5 py-1.5 text-xs md:text-[13px] border border-gray-200 rounded-lg focus:ring-1.5 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white placeholder:text-gray-400"
                />
              </div>

              Project category
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  What do you want to build?
                </label>
                <select
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs md:text-[13px] border border-gray-200 rounded-lg focus:ring-1.5 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white text-gray-800"
                >
                  <option value="branding package">Branding package</option>
                  <option value="social media">Social media</option>
                  <option value="motion graphics/video">Motion graphics / video</option>
                  <option value="mobile site">Mobile site</option>
                  <option value="pitch deck">Pitch deck</option>
                  <option value="mobile app">Mobile app</option>
                  <option value="plugin">Plugin</option>
                </select>
              </div>

              Priority
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  How soon do you want it done?
                </label>
                <select
                  value={projectPriority}
                  onChange={(e) =>
                    setProjectPriority(
                      e.target.value as 'urgent' | 'within-month' | 'no-rush'
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs md:text-[13px] border border-gray-200 rounded-lg focus:ring-1.5 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 hover:bg-white text-gray-800"
                >
                  <option value="urgent">Urgent</option>
                  <option value="within-month">Within the month</option>
                  <option value="no-rush">No rush</option>
                </select>
              </div>
            </div>

            Project Name
            <div className="transition-all duration-500 ease-out transform opacity-100 translate-y-0">
              <label
                htmlFor="project-name"
                className="block text-sm font-semibold text-gray-900 mb-1.5"
              >
                Project Name <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., E-commerce Website Redesign"
                className="w-full px-3.5 py-2.5 text-[15px] border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white font-medium placeholder:text-gray-400"
              />
            </div>

            Project Summary – animates in after name
            <div
              className={`transition-all duration-500 ease-out transform origin-top ${
                showSummaryField
                  ? 'opacity-100 translate-y-0 max-h-[1000px]'
                  : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden pointer-events-none'
              }`}
            >
              <label
                htmlFor="project-context"
                className="block text-sm font-semibold text-gray-900 mb-3"
              >
                Project Summary{' '}
                <span className="text-gray-400 text-sm font-normal">(Optional)</span>
                {projectAnalysis && (
                  <button
                    type="button"
                    onClick={() => {
                      const parts: string[] = [];

                      if (jobTitle.trim()) {
                        parts.push(
                          `As a ${jobTitle.trim()}, you are sponsoring a ${projectCategory} engagement that needs to be both creatively strong and operationally sound.`
                        );
                      } else {
                        parts.push(
                          `You are sponsoring a ${projectCategory} engagement that needs to be both creatively strong and operationally sound.`
                        );
                      }

                      parts.push(
                        `The core objective is to create a clear, modern experience for ${projectName || 'this project'} that reflects the brand at a high standard while driving measurable outcomes.`
                      );

                      if (projectPriority === 'urgent') {
                        parts.push(
                          'Timeline is critical; the work needs to move quickly while still protecting quality and alignment with stakeholders.'
                        );
                      } else if (projectPriority === 'within-month') {
                        parts.push(
                          'The project should move efficiently over the next few weeks with enough space for collaboration and iteration.'
                        );
                      } else {
                        parts.push(
                          'There is room to move thoughtfully, validating decisions and sequencing work in a way that reduces risk.'
                        );
                      }

                      setProjectContext(parts.join(' '));
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-portfolio-blue rounded-full text-xs font-semibold border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate with AI
                  </button>
                )}
              </label>
              <textarea
                id="project-context"
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="Provide a summary of your project, goals, or requirements... The more details you share, the more accurate our AI-powered assessment will be."
                rows={6}
                className="w-full px-6 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white resize-none placeholder:text-gray-400 leading-relaxed"
              />
              <p className="mt-2 text-xs text-gray-500">
                This helps our AI learning system better understand and anticipate your project needs
              </p>
              {(projectName.trim() || projectContext.trim() || jobTitle.trim()) && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">AI Insights:</p>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-[11px] text-portfolio-blue transition-opacity duration-300 opacity-100">
                      <span className="w-2 h-2 rounded-full bg-portfolio-blue animate-ping" />
                      <span className="animate-pulse">Thinking&hellip;</span>
                    </div>
                  ) : projectAnalysis && Object.keys(predictions).length > 0 ? (
                    <ul className="text-xs text-gray-600 space-y-1">
                      {projectAnalysis.projectType && (
                        <li>
                          • Detected project type:{' '}
                          <span className="font-medium">{projectAnalysis.projectType}</span>
                        </li>
                      )}
                      {projectAnalysis.complexity && (
                        <li>
                          • Complexity level:{' '}
                          <span className="font-medium">{projectAnalysis.complexity}</span>
                        </li>
                      )}
                      {projectAnalysis.industry && (
                        <li>
                          • Industry:{' '}
                          <span className="font-medium">{projectAnalysis.industry}</span>
                        </li>
                      )}
                      {projectAnalysis.features.length > 0 && (
                        <li>
                          • Features detected:{' '}
                          <span className="font-medium">
                            {projectAnalysis.features.join(', ')}
                          </span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-500">
                      Start typing above to generate AI insights about this project.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleStartQuestions}
              disabled={!isFormComplete}
              className={`w-full group relative flex items-center justify-center px-8 py-5 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
                isFormComplete
                  ? 'bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] text-black hover:from-[#FFC700] hover:via-[#FFD700] hover:to-[#FFC700] hover:shadow-[#FFD700]/50'
                  : 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative flex items-center gap-3">
                Begin Project Visualization
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            </div>
          </div>
          */}

          {/* Real-time agent transcript feed */}
          {agentTranscriptHistory.length > 0 && (
            <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white/80 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold tracking-wide text-[11px] uppercase text-white/60">
                  Agent transcript
                </span>
                <span className="text-[10px] text-white/40">
                  Live view of what the agent is saying
                </span>
              </div>
              <div className="space-y-1.5">
                {agentTranscriptHistory.map((line: string, idx: number) => (
                  <p key={`${idx}-${line.slice(0, 8)}`} className="leading-snug">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <VersionManager currentVersion="v.91" />
    </>
  );
}

  // Strategic market & competitive research screen (Step 2)
  if (flowStep === 'research') {
    // Ensure we always have some research data to display
    const displayResearch = marketResearch || {
      marketSummary: 'Preparing market analysis...',
      competitiveLandscape: 'Evaluating competitive landscape...',
      bestPractices: 'Analyzing best practices...',
      strategicRecommendations: 'Generating strategic recommendations...',
      metrics: {
        competitiveIntensity: 70,
        differentiationOpportunity: 30,
        uxElevationNeeded: 75,
        timelinePressure: 60,
      },
    };

    return (
      <>
      <div className="portfolio-bg pb-12 px-4" style={{ marginLeft: '-500px', marginRight: '-500px', paddingLeft: '500px', paddingRight: '500px', minHeight: '100vh' }}>
        <TopBar />
        <div className="max-w-5xl mx-auto pt-10">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Step 2 · Strategic Market Review
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                  Market fit & competitive evaluation
                </h2>
                <p className="text-sm text-gray-600 mt-2 max-w-2xl">
                  Using your project name and summary, we infer the most relevant market, scan similar initiatives,
                  and synthesize best practices so the proposal is grounded in real competitive context.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Market Context */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Market context</h3>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-blue-700">Active</span>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.marketSummary}</p>
                
                {/* Market Growth Indicator */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-gray-600">Market growth potential</span>
                    <span className="text-[10px] font-bold text-gray-900">
                      {Math.round(100 - displayResearch.metrics.competitiveIntensity * 0.6)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${Math.round(100 - displayResearch.metrics.competitiveIntensity * 0.6)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Based on category analysis</p>
                </div>
              </div>

              {/* Competitive Landscape */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Competitive landscape</h3>
                  <div className="px-2 py-1 bg-amber-100 rounded-full">
                    <span className="text-[10px] font-semibold text-amber-700">
                      {displayResearch.metrics.competitiveIntensity}/100
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.competitiveLandscape}</p>
                
                {/* Competitive Intensity Visual */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-gray-600">Competitive intensity</span>
                    <span className="text-[10px] font-bold text-gray-900">
                      {displayResearch.metrics.competitiveIntensity}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-red-500"
                      style={{ width: `${displayResearch.metrics.competitiveIntensity}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">
                    {displayResearch.metrics.competitiveIntensity > 80 ? 'Highly competitive' : 
                     displayResearch.metrics.competitiveIntensity > 60 ? 'Moderately competitive' : 
                     'Less competitive'} market
                  </p>
                </div>
              </div>

              {/* Best Practice Signals */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Best‑practice signals</h3>
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                    <span className="text-[10px] font-semibold text-purple-700">
                      {Math.round(displayResearch.metrics.uxElevationNeeded * 0.85)}% adoption
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.bestPractices}</p>
                
                {/* Best Practice Adoption Rate */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-gray-600">Industry best practice adoption</span>
                    <span className="text-[10px] font-bold text-gray-900">
                      {Math.round(displayResearch.metrics.uxElevationNeeded * 0.85)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-indigo-600"
                      style={{ width: `${Math.round(displayResearch.metrics.uxElevationNeeded * 0.85)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Based on 2024 industry standards</p>
                </div>
              </div>

              {/* Strategic Recommendation */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Strategic recommendation</h3>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                    <span className="text-[10px] font-semibold text-green-700">
                      {Math.round((displayResearch.metrics.differentiationOpportunity + 20) * 0.9)}% confidence
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.strategicRecommendations}</p>
                
                {/* Strategic Alignment Score */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-gray-600">Strategic alignment score</span>
                    <span className="text-[10px] font-bold text-gray-900">
                      {Math.round((displayResearch.metrics.differentiationOpportunity + 20) * 0.9)}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-600"
                      style={{ width: `${Math.round((displayResearch.metrics.differentiationOpportunity + 20) * 0.9)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 mt-1">Project fit & opportunity alignment</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setFlowStep('intro')}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                onClick={() => {
                  // User is leaving Step 2 to start questions: clear answers and reset index
                  setAnswers([]);
                  setCurrentQuestionIndex(0);
                  setFlowStep('questions');
                }}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-portfolio-blue font-semibold text-sm shadow-md hover:bg-gray-50"
              >
                Continue to questions
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <VersionManager currentVersion="v.91" />
    </>
  );
}

  // Estimate/Dashboard screen (after questions are answered) - check BEFORE questions
  if (showEstimate && estimate) {
    return (
      <>
      <div className="portfolio-bg pb-12 px-4" style={{ marginLeft: '-500px', marginRight: '-500px', paddingLeft: '500px', paddingRight: '500px', maxWidth: '100%', minHeight: '100vh' }}>
        <TopBar />
        <div className="w-full mx-auto pt-10">
          {/* Top actions row: Back, Start over, Export */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={handleBackToQuestions}
              className="flex items-center text-white/90 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Questions
            </button>

            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={handleResetToStart}
                className="text-white/80 hover:text-white underline-offset-4 hover:underline transition-colors"
              >
                Start over
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('proposalbuilder:export-sow'));
                  }
                }}
                className="text-white/90 hover:text-white font-semibold underline-offset-4 hover:underline transition-colors"
              >
                Export
              </button>
            </div>
          </div>
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
              
              // Recalculate timeline based on new total hours
              const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference' || a.questionId === 'timeline-urgency');
              const timelineValue = timelineAnswer?.value as string | undefined;
              const newTimeline = calculateTimeline(newTotalHours, timelineValue);
              
              setEstimate({
                ...estimate,
                tasks: updatedTasks,
                totalHours: newTotalHours,
                timeline: newTimeline,
              });
            }}
            projectName={projectName}
            projectSummary={projectContext}
            answers={answers}
            marketResearch={marketResearch}
          />
        </div>
      </div>
      <VersionManager currentVersion="v.91" />
    </>
  );
}

  // Questions screen (flowStep === 'questions')
  if (flowStep === 'questions') {
    return (
      <>
        <div className="portfolio-bg pb-12 px-4" style={{ marginLeft: '-500px', marginRight: '-500px', paddingLeft: '500px', paddingRight: '500px', minHeight: '100vh' }}>
          <TopBar />
          <div className="max-w-6xl mx-auto pt-10">
            {/* Header Row - Full Width */}
            <div className="mb-8">
              {/* Header */}
              <div className="text-left">
                <div className="flex items-end gap-3 mb-4">
                  <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Proposal Builder
                  </h1>
                  <span className="text-sm text-white/70 font-medium pb-1">
                    AI-powered
                  </span>
                </div>
                <p className="text-lg text-white/90 mb-4 font-light">
                  Answer a few strategic questions to get a transparent project estimate
                </p>
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
            </div>

            {/* Two Column Layout - Question Card and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2/3): Main Question Area */}
              <div className="lg:col-span-2">
                {/* Question Card */}
                {currentQuestion && (
                  <QuestionCard
                    question={currentQuestion}
                    answer={currentAnswer || null}
                    allAnswers={answers}
                    onAnswer={handleAnswer}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={questions.length}
                    projectName={projectName}
                    projectSummary={projectContext}
                    onPrevious={handleQuestionBack}
                    onNext={
                      currentQuestionIndex === questions.length - 1
                        ? generateEstimate
                        : handleNext
                    }
                    canGoBack={true}
                    isLastQuestion={currentQuestionIndex === questions.length - 1}
                    canContinue={
                      currentQuestionIndex === questions.length - 1
                        ? !!currentAnswer  // On last question, only need current question answered
                        : !!currentAnswer
                    }
                  />
                )}
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
                    projectName={projectName}
                    projectContext={projectContext}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Start New Proposal?</h3>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                Starting a new proposal will delete any work done on the current. Start over?
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetToStart}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}
        <VersionManager currentVersion="v.91" />
      </>
    );
  }


  // Default fallback - should never reach here, but ensures something renders
  return (
    <>
      <div className="portfolio-bg py-12 px-4 flex items-center justify-center" style={{ marginLeft: '-500px', marginRight: '-500px', paddingLeft: '500px', paddingRight: '500px', minHeight: '100vh' }}>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-white/70">Please wait while we prepare your proposal builder.</p>
        </div>
      </div>
      <VersionManager currentVersion="v.91" />
    </>
  );
}
