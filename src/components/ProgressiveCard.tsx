import { useState, useEffect, useRef } from 'react';
import { Question, Answer, Estimate } from '../types';
import { ArrowRight } from 'lucide-react';
import { MarketResearchResult } from '../utils/marketResearch';
import { EstimateVisualization } from './EstimateVisualization';
import { calculateTimeline } from '../utils/estimateEngine';

interface ProgressiveCardProps {
  // Basic fields
  jobTitle: string;
  projectCategory: string;
  projectPriority: 'urgent' | 'within-month' | 'no-rush' | '';
  projectName: string;
  projectContext: string;
  
  // Setters
  setJobTitle: (value: string) => void;
  setProjectCategory: (value: string) => void;
  setProjectPriority: (value: 'urgent' | 'within-month' | 'no-rush') => void;
  setProjectName: (value: string) => void;
  setProjectContext: (value: string) => void;
  
  // Discovery questions
  questions: Question[];
  answers: Answer[];
  setAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
  
  // Market research
  marketResearch: MarketResearchResult | null;
  onRunResearch?: () => void;
  
  // Estimate
  estimate: Estimate | null;
  setEstimate?: (estimate: Estimate | null) => void;
  onTaskMultiplierChange?: (taskId: string, multiplier: number) => void;
  
  // Callbacks
  onGenerateEstimate: () => Estimate | null;
  onVoiceUpdate?: (data: {
    jobTitle?: string;
    projectCategory?: string;
    projectPriority?: 'urgent' | 'within-month' | 'no-rush';
    projectName?: string;
    projectSummary?: string;
  }) => void;
}

export function ProgressiveCard({
  jobTitle,
  projectCategory,
  projectPriority,
  projectName,
  projectContext,
  setJobTitle,
  setProjectCategory,
  setProjectPriority,
  setProjectName,
  setProjectContext,
  questions,
  answers,
  setAnswers,
  marketResearch,
  onRunResearch,
  estimate,
  setEstimate,
  onTaskMultiplierChange,
  onGenerateEstimate,
  onVoiceUpdate,
}: ProgressiveCardProps) {
  // Track which step we're on (0-4 = basic fields, 5 = research step, 6+ = discovery questions)
  // Start with -1 so no step is active by default
  const [currentStep, setCurrentStep] = useState(-1);
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set([0]));
  // Track which dropdowns/selects are open
  const [openDropdowns, setOpenDropdowns] = useState<Set<number>>(new Set());
  const selectRefs = useRef<{ [key: number]: HTMLSelectElement | null }>({});
  const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | HTMLTextAreaElement | null }>({});
  // Track collapsed rows (completed steps that are minimized)
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());
  // Track hovered step (for temporary expansion)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  // Track focused inputs (for active styling)
  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  // Track completion status for button
  const [allComplete, setAllComplete] = useState(false);
  // Track if research step is completed and collapsed (to show questions card)
  const [showQuestionsCard, setShowQuestionsCard] = useState(false);
  // Track timeouts for cleanup
  const timeoutRefs = useRef<Set<number>>(new Set());
  
  const RESEARCH_STEP_INDEX = 5; // Step index for research (after 5 context questions)
  
  // Helper to create timeout with cleanup tracking
  const createTimeout = (callback: () => void, delay: number): number => {
    const id = window.setTimeout(() => {
      timeoutRefs.current.delete(id);
      callback();
    }, delay);
    timeoutRefs.current.add(id);
    return id;
  };
  
  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(id => clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);
  
  // Basic field steps
  const BASIC_STEPS = [
    { key: 'jobTitle', value: jobTitle, setter: setJobTitle, label: 'What do you do?', placeholder: 'What do you do?', type: 'text' },
    { key: 'projectCategory', value: projectCategory || '', setter: setProjectCategory, label: 'What do you want to build?', placeholder: 'What do you want to build?', type: 'select', options: ['branding package', 'social media', 'motion graphics/video', 'mobile site', 'pitch deck', 'mobile app', 'plugin'] },
    { key: 'projectPriority', value: projectPriority || '', setter: setProjectPriority, label: 'How soon do you want it done?', placeholder: 'How soon do you want it done?', type: 'select', options: ['urgent', 'within-month', 'no-rush'] },
    { key: 'projectName', value: projectName, setter: setProjectName, label: 'Project Name', placeholder: 'What is the project name?', type: 'text', required: true },
    { key: 'projectContext', value: projectContext, setter: setProjectContext, label: 'Project Summary', placeholder: 'Provide a summary of your project, goals, or requirements...', type: 'textarea' },
  ];
  
  // Check if a step is complete
  const isStepComplete = (stepIndex: number): boolean => {
    if (stepIndex < BASIC_STEPS.length) {
      const step = BASIC_STEPS[stepIndex];
      return step.value.trim() !== '';
    } else if (stepIndex === RESEARCH_STEP_INDEX) {
      // Research step is complete if we have research data
      return marketResearch !== null;
    } else {
      // Discovery question - use RESEARCH_STEP_INDEX for consistency
      const questionIndex = stepIndex - RESEARCH_STEP_INDEX - 1; // -1 for research step
      const question = questions[questionIndex];
      if (!question) return false;
      
      const answer = answers.find(a => a.questionId === question.id);
      
      // For select questions, check both the answer state AND the select element's value directly
      // This handles cases where onChange hasn't updated state yet
      if (question.type === 'select') {
        // First check the select element directly (most immediate) - this catches the value before state updates
        const selectEl = selectRefs.current[stepIndex];
        if (selectEl) {
          const selectValue = selectEl.value;
          // Check if select has a value that's not empty (empty string is the placeholder option)
          if (selectValue && selectValue.trim() !== '') {
            return true; // Select has a non-empty value (any selected option is valid)
          }
        }
        // Then check the answer state (after state has updated)
        const value = answer?.value;
        if (value !== undefined && value !== null) {
          if (typeof value === 'string') {
            // Make sure it's not empty
            return value.trim() !== '';
          }
          return true; // Non-string values are considered complete
        }
        return false;
      }
      
      if (question.type === 'multi-select') {
        return Array.isArray(answer?.value) && answer.value.length > 0;
      }
      // Check for both string and non-empty string values
      const value = answer?.value;
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      return true; // For non-string values (like numbers, booleans), consider them complete if they exist
    }
  };
  
  // Manual advance - no auto-progress
  const handleNext = () => {
    const stepToCollapse = currentStep;
    const nextStep = currentStep + 1;
    // Total steps: 5 basic + 1 research + discovery questions
    const totalSteps = BASIC_STEPS.length + 1 + (questions.length > 0 ? questions.length : 0);
    
    // If we're at the last basic field (step 4), trigger research
    if (currentStep === BASIC_STEPS.length - 1 && onRunResearch) {
      onRunResearch();
    }
    
    // Don't advance to discovery questions until we have questions available
    if (nextStep > RESEARCH_STEP_INDEX && questions.length === 0) {
      return; // Wait for questions to be generated
    }
    
    // Collapse current step if complete BEFORE moving to next (so it's already collapsed when currentStep changes)
    if (isStepComplete(stepToCollapse)) {
      setCollapsedSteps(prev => new Set([...prev, stepToCollapse]));
    }
    
    // If user is moving forward past research step AND research is complete AND questions are available, show the questions card
    // CRITICAL: Only show when moving FROM research step (index 5) TO discovery questions (index 6+)
    // This ensures the card only appears AFTER research is completed, not during context questions (0-4)
    if (stepToCollapse === RESEARCH_STEP_INDEX && 
        isStepComplete(RESEARCH_STEP_INDEX) && 
        nextStep > RESEARCH_STEP_INDEX && 
        questions.length > 0) {
      // Show card only after we've moved past research step (research is now collapsed)
      // Use a small delay to ensure state updates have propagated
      createTimeout(() => {
        setShowQuestionsCard(true);
        // Make only the first question visible when the card appears (questions show progressively)
        const firstQuestionStepIndex = RESEARCH_STEP_INDEX + 1; // First question is at index 6
        setVisibleSteps(prev => {
          if (!prev.has(firstQuestionStepIndex)) {
            return new Set([...prev, firstQuestionStepIndex]);
          }
          return prev;
        });
      }, 100);
    }
    
    // Don't advance past the last step - stop at the last question
    if (nextStep < totalSteps) {
      // Update to next step after collapsing
      setCurrentStep(nextStep);
      setVisibleSteps(prev => new Set([...prev, nextStep]));
      
      // Auto-focus the next input field
      createTimeout(() => {
        // Check if it's a select field
        const selectEl = selectRefs.current[nextStep];
        if (selectEl) {
          selectEl.focus();
        } else {
          // Check if it's a text input or textarea
          const inputEl = inputRefs.current[nextStep];
          if (inputEl) {
            inputEl.focus();
          }
        }
      }, 100);
    } else {
      // We're at the last step - collapse it but keep currentStep on the last question
      // This ensures the questions card stays visible
      // Don't set currentStep to -1 here, keep it on the last question so the card remains visible
      
      // Collapse the current step
      if (isStepComplete(stepToCollapse)) {
        setCollapsedSteps(prev => new Set([...prev, stepToCollapse]));
      }
      
      // Keep currentStep on the last question (don't reset to -1)
      // This ensures the questions card stays visible and the user can still interact with the last question
      
      // Then collapse all other completed steps after a brief delay to ensure state has updated
      createTimeout(() => {
        const allStepIndices: number[] = [
          ...BASIC_STEPS.map((_, idx) => idx),
          RESEARCH_STEP_INDEX,
          ...questions.map((_, idx) => RESEARCH_STEP_INDEX + 1 + idx)
        ];
        
        setCollapsedSteps(prev => {
          const newCollapsed = new Set(prev);
          allStepIndices.forEach(stepIdx => {
            if (isStepComplete(stepIdx)) {
              newCollapsed.add(stepIdx);
            }
          });
          return newCollapsed;
        });
      }, 150);
      
      // Don't advance further - the estimate button will appear when all steps are complete
      return;
    }
  };
  
  // Handle clicking on a completed field to reactivate it
  const handleFieldClick = (stepIndex: number) => {
    if (isStepComplete(stepIndex) && stepIndex !== currentStep) {
      // Remove from collapsed set when reactivating
      setCollapsedSteps(prev => {
        const next = new Set(prev);
        next.delete(stepIndex);
        return next;
      });
      
      // Reactivate this step
      setCurrentStep(stepIndex);
      setVisibleSteps(prev => new Set([...prev, stepIndex]));
      
      // For select fields, open dropdown when reactivating
      if (stepIndex < BASIC_STEPS.length) {
        const step = BASIC_STEPS[stepIndex];
        if (step.type === 'select') {
          setOpenDropdowns(prev => new Set([...prev, stepIndex]));
          // Focus and click the select element after it renders
          createTimeout(() => {
            const selectEl = selectRefs.current[stepIndex];
            if (selectEl) {
              selectEl.focus();
              selectEl.click();
            }
          }, 10);
        }
      } else {
        // Discovery question
        const questionIndex = stepIndex - RESEARCH_STEP_INDEX - 1; // Account for research step
        const question = questions[questionIndex];
        if (question && (question.type === 'select' || question.type === 'multi-select')) {
          setOpenDropdowns(prev => new Set([...prev, stepIndex]));
          // Focus and click the select element after it renders
          createTimeout(() => {
            const selectEl = selectRefs.current[stepIndex];
            if (selectEl) {
              selectEl.focus();
              selectEl.click();
            }
          }, 10);
        }
      }
    }
  };
  
  // Handle field changes
  const handleFieldChange = (stepIndex: number, value: string) => {
    if (stepIndex < BASIC_STEPS.length) {
      const step = BASIC_STEPS[stepIndex];
      step.setter(value as any);
      
      // Close dropdown when value is selected, or open if voice update comes in
      if (step.type === 'select') {
        if (value) {
          setOpenDropdowns(prev => {
            const next = new Set(prev);
            next.delete(stepIndex);
            return next;
          });
        } else {
          // If value is cleared, ensure dropdown can open
          setOpenDropdowns(prev => {
            const next = new Set(prev);
            if (!next.has(stepIndex)) {
              next.add(stepIndex);
            }
            return next;
          });
        }
      }
      
      // Notify voice handler if provided
      if (onVoiceUpdate) {
        const update: any = {};
        update[step.key] = value;
        onVoiceUpdate(update);
      }
    }
  };
  
  // Immediately collapse a completed step
  const collapseStepImmediately = (stepIndex: number, forceCollapse: boolean = false) => {
    // If forceCollapse is true, collapse immediately without checking completion (used when moving to next)
    if (forceCollapse) {
      setCollapsedSteps(prev => {
        if (!prev.has(stepIndex)) {
          return new Set([...prev, stepIndex]);
        }
        return prev;
      });
    } else if (isStepComplete(stepIndex) && stepIndex !== currentStep) {
      // Only check completion if not forcing collapse
      setCollapsedSteps(prev => {
        if (!prev.has(stepIndex)) {
          return new Set([...prev, stepIndex]);
        }
        return prev;
      });
    }
  };
  
  // Check if user has moved past research step AND questions are available
  // Only show questions card when explicitly moving past research in handleNext
  // This useEffect only hides it if conditions aren't met (safety check)
  // IMPORTANT: Don't hide the card if estimate exists (user has completed everything)
  useEffect(() => {
    // If estimate exists, ensure the questions card stays visible (user has completed everything)
    // This is CRITICAL - when estimate exists, we MUST keep the cards visible
    if (estimate) {
      // Always show questions card when estimate exists (if questions exist)
      if (questions.length > 0) {
        setShowQuestionsCard(true);
      }
      // Also ensure all steps are visible so they can be rendered (even if collapsed)
      setVisibleSteps(prev => {
        const newSet = new Set(prev);
        // Add all basic steps
        BASIC_STEPS.forEach((_, idx) => {
          newSet.add(idx);
        });
        // Add research step
        newSet.add(RESEARCH_STEP_INDEX);
        // Add all question steps
        questions.forEach((_, idx) => {
          const stepIndex = RESEARCH_STEP_INDEX + 1 + idx;
          newSet.add(stepIndex);
        });
        return newSet;
      });
      // Ensure all steps are collapsed so they show their collapsed view
      setCollapsedSteps(prev => {
        const newSet = new Set(prev);
        // Add all basic steps
        BASIC_STEPS.forEach((_, idx) => {
          newSet.add(idx);
        });
        // Add research step
        newSet.add(RESEARCH_STEP_INDEX);
        // Add all question steps
        questions.forEach((_, idx) => {
          const stepIndex = RESEARCH_STEP_INDEX + 1 + idx;
          newSet.add(stepIndex);
        });
        return newSet;
      });
      return; // Don't hide the card when estimate is shown
    }
    
    const researchComplete = isStepComplete(RESEARCH_STEP_INDEX);
    const researchCollapsed = collapsedSteps.has(RESEARCH_STEP_INDEX);
    const hasMovedPastResearch = currentStep > RESEARCH_STEP_INDEX;
    const questionsAvailable = questions.length > 0;
    
    // Hide card if ANY condition isn't met (safety check - don't auto-show here)
    if (!researchComplete || !researchCollapsed || !hasMovedPastResearch || !questionsAvailable) {
      setShowQuestionsCard(false);
    }
  }, [collapsedSteps, currentStep, questions.length, marketResearch, estimate, questions]); // Dependencies for visibility logic
  
  // Handle voice updates - open dropdowns when values come from voice
  useEffect(() => {
    // If projectCategory gets a value from voice, open its dropdown briefly then close
    if (projectCategory && !openDropdowns.has(1)) {
      // Value was set, ensure dropdown is closed
      setOpenDropdowns(prev => {
        const next = new Set(prev);
        next.delete(1);
        return next;
      });
    }
    // Same for priority
    if (projectPriority && !openDropdowns.has(2)) {
      setOpenDropdowns(prev => {
        const next = new Set(prev);
        next.delete(2);
        return next;
      });
    }
  }, [projectCategory, projectPriority, openDropdowns]);
  
  // Center the active step vertically on the page and focus it for keyboard input
  useEffect(() => {
    // Don't do anything if no step is active
    if (currentStep === -1) return;
    
    const activeStepElement = stepRefs.current[currentStep];
    const timeoutIds: number[] = [];
    
    if (activeStepElement) {
      // Focus the element if it's the research step (so Enter key works)
      if (currentStep === RESEARCH_STEP_INDEX) {
        const focusTimeoutId = createTimeout(() => {
          activeStepElement.focus();
        }, 50);
        timeoutIds.push(focusTimeoutId);
      }
      
      // Use tracked timeout to ensure DOM has updated
      const scrollTimeoutId = createTimeout(() => {
        const elementRect = activeStepElement.getBoundingClientRect();
        const elementCenter = elementRect.top + elementRect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const scrollOffset = elementCenter - viewportCenter;
        
        window.scrollTo({
          top: window.scrollY + scrollOffset,
          behavior: 'smooth'
        });
      }, 100);
      timeoutIds.push(scrollTimeoutId);
    }
    
    // Ensure active step is never collapsed (but only if it's not complete)
    // Completed steps should stay collapsed even when active (user clicked to edit)
    // Only remove incomplete steps from collapsed when they become active
    const collapseTimeoutId = createTimeout(() => {
      setCollapsedSteps(prev => {
        // Only remove from collapsed if step is active AND not complete
        if (prev.has(currentStep) && !isStepComplete(currentStep)) {
          const next = new Set(prev);
          next.delete(currentStep);
          return next;
        }
        return prev;
      });
    }, 50);
    timeoutIds.push(collapseTimeoutId);
    
    return () => {
      timeoutIds.forEach(id => {
        clearTimeout(id);
        timeoutRefs.current.delete(id);
      });
    };
  }, [currentStep]);
  
  // Consolidated collapse logic - single useEffect to prevent loops
  // Use refs to track previous values and prevent unnecessary updates
  const prevValuesRef = useRef<{
    currentStep: number;
    answersLength: number;
    questionsLength: number;
    jobTitle: string;
    projectCategory: string;
    projectPriority: string;
    projectName: string;
    projectContext: string;
    marketResearch: MarketResearchResult | null;
  } | null>(null);
  
  useEffect(() => {
    const currentValues = {
      currentStep,
      answersLength: answers.length,
      questionsLength: questions.length,
      jobTitle,
      projectCategory,
      projectPriority,
      projectName,
      projectContext,
      marketResearch,
    };
    
    // Check if anything actually changed
    const prev = prevValuesRef.current;
    if (prev) {
      const hasChanges = 
        prev.currentStep !== currentStep ||
        prev.answersLength !== answers.length ||
        prev.questionsLength !== questions.length ||
        prev.jobTitle !== jobTitle ||
        prev.projectCategory !== projectCategory ||
        prev.projectPriority !== projectPriority ||
        prev.projectName !== projectName ||
        prev.projectContext !== projectContext ||
        prev.marketResearch !== marketResearch;
      
      if (!hasChanges) {
        prevValuesRef.current = currentValues;
        return; // No changes, skip update
      }
    }
    
    prevValuesRef.current = currentValues;
    
    // Debounce collapse updates to prevent cascading re-renders
    const timeoutId = createTimeout(() => {
      // Get all step indices
      const allStepIndices: number[] = [
        ...BASIC_STEPS.map((_, idx) => idx),
        RESEARCH_STEP_INDEX,
        ...questions.map((_, idx) => RESEARCH_STEP_INDEX + 1 + idx)
      ];
      
      // Batch all collapse updates into a single setState call
      setCollapsedSteps(prev => {
        const newCollapsed = new Set(prev);
        let hasChanges = false;
        
        allStepIndices.forEach(stepIndex => {
          const shouldBeCollapsed = isStepComplete(stepIndex) && (currentStep === -1 || stepIndex !== currentStep);
          if (shouldBeCollapsed && !newCollapsed.has(stepIndex)) {
            newCollapsed.add(stepIndex);
            hasChanges = true;
          } else if (!shouldBeCollapsed && newCollapsed.has(stepIndex) && (currentStep === -1 || stepIndex === currentStep)) {
            // Only remove from collapsed if it's the current step and not complete
            if (!isStepComplete(stepIndex)) {
              newCollapsed.delete(stepIndex);
              hasChanges = true;
            }
          }
        });
        
        // Only return new Set if there were changes
        return hasChanges ? newCollapsed : prev;
      });
      
      // Update completion status for button
      const isComplete = allStepsComplete();
      setAllComplete(isComplete);
    }, 50); // Small debounce to batch updates
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(timeoutId);
      }
    };
  }, [currentStep, jobTitle, projectCategory, projectPriority, projectName, projectContext, answers, questions, marketResearch]);
  
  // Update completion status immediately when answers or other dependencies change
  useEffect(() => {
    // Small delay to ensure state has settled
    const timeoutId = createTimeout(() => {
      // Check completion by also looking at select elements' current values
      // This handles cases where onChange hasn't updated state yet
      let allComplete = true;
      
      // Check basic steps
      const basicComplete = BASIC_STEPS.every((_, i) => isStepComplete(i));
      if (!basicComplete) allComplete = false;
      
      // Check research step
      const researchComplete = isStepComplete(RESEARCH_STEP_INDEX);
      if (!researchComplete) allComplete = false;
      
      // Check questions - also check select elements directly
      const questionsComplete = questions.every((q, i) => {
        const stepIndex = RESEARCH_STEP_INDEX + 1 + i;
        
        // For select questions, also check the select element's value directly
        if (q.type === 'select') {
          const selectEl = selectRefs.current[stepIndex];
          if (selectEl && selectEl.value) {
            return true; // Select has a value
          }
        }
        
        // Otherwise use normal completion check
        return isStepComplete(stepIndex);
      });
      
      if (!questionsComplete) allComplete = false;
      
      setAllComplete(allComplete);
    }, 150); // Slightly longer delay to ensure all state updates have propagated
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(timeoutId);
      }
    };
  }, [answers, jobTitle, projectCategory, projectPriority, projectName, projectContext, marketResearch, questions.length, questions]);
  
  // Debounced estimate update - only updates existing estimate, doesn't create new one
  useEffect(() => {
    // Only update if estimate already exists (user has clicked Generate Estimate button)
    if (!estimate || answers.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      if (onGenerateEstimate && setEstimate) {
        const newEstimate = onGenerateEstimate();
        if (newEstimate) {
          setEstimate(newEstimate);
        }
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [answers, projectName, projectContext, onGenerateEstimate, setEstimate, estimate]);
  
  // Research update - only when project context changes (not on every answer change)
  useEffect(() => {
    if (!projectName.trim() || !onRunResearch) return;
    
    // Only update research if we have the basic fields filled
    if (projectName.trim() && projectContext.trim()) {
      const timeoutId = setTimeout(() => {
        onRunResearch();
      }, 1000); // 1 second debounce for research (more expensive operation)
      
      return () => clearTimeout(timeoutId);
    }
  }, [projectName, projectContext, onRunResearch]);
  
  // Handle dropdown toggle
  const toggleDropdown = (stepIndex: number) => {
    setOpenDropdowns(prev => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
  };
  
  // Ensure dropdown opens when clicking on select input
  const handleSelectInputClick = (stepIndex: number) => {
    // Make sure this step is active
    if (stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
      setVisibleSteps(prev => new Set([...prev, stepIndex]));
    }
    // Open dropdown
    if (!openDropdowns.has(stepIndex)) {
      toggleDropdown(stepIndex);
      // Focus and click the select element after it renders to open dropdown immediately
      setTimeout(() => {
        const selectEl = selectRefs.current[stepIndex];
        if (selectEl) {
          selectEl.focus();
          selectEl.click();
        }
      }, 10);
    }
  };
  
  // Handle discovery question answer
  const handleQuestionAnswer = (question: Question, value: string | string[] | number) => {
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionId !== question.id);
      return [...filtered, { questionId: question.id, value }];
    });
    
    // Open dropdown for multi-select when first option is selected, close for select
    const questionIndex = questions.findIndex(q => q.id === question.id);
    if (questionIndex !== -1) {
      const stepIndex = RESEARCH_STEP_INDEX + 1 + questionIndex; // +1 because research step is at RESEARCH_STEP_INDEX
      if (question.type === 'select' && value) {
        // Close dropdown when value is selected
        setOpenDropdowns(prev => {
          const next = new Set(prev);
          next.delete(stepIndex);
          return next;
        });
        // Don't auto-collapse here - let Enter/Next handle it immediately
      } else if (question.type === 'multi-select' && Array.isArray(value) && value.length > 0) {
        // Open dropdown when first option is selected
        setOpenDropdowns(prev => {
          const next = new Set(prev);
          next.add(stepIndex);
          return next;
        });
        // Auto-collapse when completed (only if not currently active)
        // Use tracked timeout for cleanup
        createTimeout(() => {
          setCollapsedSteps(prev => {
            // Only collapse if this step is not currently active and not already collapsed
            if (currentStep !== stepIndex && !prev.has(stepIndex)) {
              return new Set([...prev, stepIndex]);
            }
            return prev;
          });
        }, 500); // Longer delay for multi-select to allow user to see completion
      }
    }
  };
  
  // Handle resetting a completed step (click on collapsed row)
  const handleResetStep = (stepIndex: number) => {
    if (stepIndex < BASIC_STEPS.length) {
      // Reset basic field
      const step = BASIC_STEPS[stepIndex];
      // Handle projectPriority specially since it doesn't accept empty string
      if (step.key === 'projectPriority') {
        setProjectPriority('no-rush'); // Default value
      } else {
        step.setter('' as any);
      }
    } else if (stepIndex === RESEARCH_STEP_INDEX) {
      // Research step can't be reset (it's auto-generated)
      return;
    } else {
      // Reset discovery question
      const questionIndex = stepIndex - RESEARCH_STEP_INDEX - 1;
      const question = questions[questionIndex];
      if (question) {
        setAnswers(prev => prev.filter(a => a.questionId !== question.id));
      }
    }
    
    // Remove from collapsed set and make it active
    setCollapsedSteps(prev => {
      const next = new Set(prev);
      next.delete(stepIndex);
      return next;
    });
    setCurrentStep(stepIndex);
    setVisibleSteps(prev => new Set([...prev, stepIndex]));
  };
  
  // REMOVED: Duplicate collapse logic - now handled in consolidated useEffect above
  
  // Toggle question dropdown
  const toggleQuestionDropdown = (questionIndex: number) => {
    const stepIndex = RESEARCH_STEP_INDEX + 1 + questionIndex; // +1 because research step is at RESEARCH_STEP_INDEX
    const isOpening = !openDropdowns.has(stepIndex);
    setOpenDropdowns(prev => {
      const next = new Set(prev);
      if (next.has(stepIndex)) {
        next.delete(stepIndex);
      } else {
        next.add(stepIndex);
      }
      return next;
    });
    // If opening, focus and click the select element after it renders
    if (isOpening) {
      setTimeout(() => {
        const selectEl = selectRefs.current[stepIndex];
        if (selectEl) {
          selectEl.focus();
          selectEl.click();
        }
      }, 10);
    }
  };
  
  // Check if all steps are complete
  const allStepsComplete = () => {
    const basicComplete = BASIC_STEPS.every((_, i) => isStepComplete(i));
    const researchComplete = isStepComplete(RESEARCH_STEP_INDEX);
    
    // Check questions - also check select elements directly for immediate feedback
    const questionsComplete = questions.every((q, i) => {
      const stepIndex = RESEARCH_STEP_INDEX + 1 + i;
      
      // For select questions, also check the select element's value directly
      // This handles cases where onChange hasn't updated state yet
      if (q.type === 'select') {
        const selectEl = selectRefs.current[stepIndex];
        if (selectEl) {
          const selectValue = selectEl.value;
          // Check if select has a value that's not empty (empty string is the placeholder option)
          if (selectValue && selectValue.trim() !== '') {
            return true; // Select has a non-empty value (any selected option is valid)
          }
        }
        // Also check answer state
        const answer = answers.find(a => a.questionId === q.id);
        if (answer?.value !== undefined && answer.value !== null) {
          if (typeof answer.value === 'string') {
            return answer.value.trim() !== '';
          }
          return true;
        }
        return false;
      }
      
      // Otherwise use normal completion check
      return isStepComplete(stepIndex);
    });
    
    return basicComplete && researchComplete && questionsComplete;
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    const totalSteps = BASIC_STEPS.length + 1 + (questions.length > 0 ? questions.length : 0);
    if (totalSteps === 0) return 0;
    
    let completedSteps = 0;
    
    // Count completed basic steps
    BASIC_STEPS.forEach((_, i) => {
      if (isStepComplete(i)) completedSteps++;
    });
    
    // Count research step
    if (isStepComplete(RESEARCH_STEP_INDEX)) completedSteps++;
    
    // Count completed questions
    questions.forEach((_, i) => {
      const stepIndex = RESEARCH_STEP_INDEX + 1 + i;
      if (isStepComplete(stepIndex)) completedSteps++;
    });
    
    return Math.min((completedSteps / totalSteps) * 100, 100);
  };
  
  // Render a basic field step
  const renderBasicField = (stepIndex: number, step: typeof BASIC_STEPS[0]) => {
    // If estimate exists, always show all steps (they'll be collapsed)
    // First step (index 0) should always be visible, even when currentStep is -1
    if (!estimate && !visibleSteps.has(stepIndex) && stepIndex !== 0) return null;
    
    const isActive = currentStep === stepIndex;
    const isComplete = isStepComplete(stepIndex);
    // A step is collapsed if it's in collapsedSteps AND not currently active
    const isCollapsed = collapsedSteps.has(stepIndex) && (currentStep === -1 || !isActive);
    const isHovered = hoveredStep === stepIndex;
    // Questions 2 and 3 (projectCategory and projectPriority) don't show next button
    const showNextButton = isStepComplete(stepIndex) && step.key !== 'projectCategory' && step.key !== 'projectPriority';
    
    // Collapsed view
    if (isCollapsed && !isHovered && !isActive) {
      const foundOption = step.value && step.options 
        ? step.options.find(opt => opt === step.value)
        : null;
      const displayValue = foundOption
        ? foundOption.charAt(0).toUpperCase() + foundOption.slice(1).replace(/-/g, ' ')
        : step.value || '';
      
      return (
        <div
          ref={(el) => { stepRefs.current[stepIndex] = el; }}
          key={step.key}
          className="transition-all duration-300 ease-out flex items-center gap-3 min-w-0 w-full cursor-pointer group/item"
          onMouseEnter={() => setHoveredStep(stepIndex)}
          onMouseLeave={() => setHoveredStep(null)}
          onClick={(e) => {
            e.stopPropagation();
            handleResetStep(stepIndex);
          }}
        >
          <div className="flex-1 min-w-0 px-4 py-2 text-sm border-2 border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-medium">{step.label}:</span>
              <span className="text-gray-700 font-medium truncate ml-2">{displayValue}</span>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div
        ref={(el) => { stepRefs.current[stepIndex] = el; }}
        key={step.key}
        className={`transition-all duration-500 ease-out flex items-center gap-3 min-w-0 w-full ${
          (isActive || stepIndex === 0 || focusedInput === stepIndex)
            ? 'opacity-100 translate-y-0 scale-100'
            : isComplete
            ? 'opacity-60 translate-y-0 scale-[0.98]'
            : 'opacity-0 -translate-y-4 scale-95 pointer-events-none h-0 overflow-hidden'
        }`}
        style={{
          animation: (isActive || stepIndex === 0) && !isComplete ? 'materialFadeIn 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)' : undefined,
        }}
        onMouseLeave={() => {
          // Always clear hover state when mouse leaves, which will collapse if it was hovered
          if (hoveredStep === stepIndex) {
            setHoveredStep(null);
          }
        }}
      >
        {step.type === 'text' && (
          <>
            <input
              ref={(el) => { inputRefs.current[stepIndex] = el; }}
              type="text"
              value={step.value}
              onChange={(e) => handleFieldChange(stepIndex, e.target.value)}
              onClick={() => handleFieldClick(stepIndex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isStepComplete(stepIndex)) {
                  e.preventDefault();
                  collapseStepImmediately(stepIndex, true);
                  handleNext();
                }
              }}
              placeholder={step.placeholder}
              onFocus={() => {
                setFocusedInput(stepIndex);
                if (currentStep === -1) {
                  setCurrentStep(stepIndex);
                  setVisibleSteps(prev => new Set([...prev, stepIndex]));
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
              }}
              onMouseEnter={() => {
                if (currentStep === -1 || currentStep === stepIndex) {
                  setFocusedInput(stepIndex);
                }
              }}
              onMouseLeave={() => {
                if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`input[data-step-index="${stepIndex}"]`)) {
                  setFocusedInput(null);
                }
              }}
              data-step-index={stepIndex}
              className={`flex-1 min-w-0 px-4 py-2 text-base border-2 rounded-xl transition-all duration-200 ${
                (focusedInput === stepIndex || hoveredStep === stepIndex)
                  ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                  : 'border-gray-200 bg-gray-50'
              } focus:outline-none placeholder:text-gray-400`}
            />
            {showNextButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium"
                title="Next"
              >
                <span>Next</span>
              </button>
            )}
          </>
        )}
        
        {step.type === 'select' && (
          <>
            {/* Special handling for projectCategory (stepIndex 1) - allow custom input */}
            {stepIndex === 1 ? (
              <>
                <input
                  type="text"
                  list={`category-options-${stepIndex}`}
                  value={step.value && step.options ? (() => {
                    const found = step.options.find(opt => opt === step.value);
                    return found ? found.charAt(0).toUpperCase() + found.slice(1).replace(/-/g, ' ') : step.value;
                  })() : step.value || ''}
                  onChange={(e) => {
                    const typedValue = e.target.value;
                    handleFieldChange(stepIndex, typedValue.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isStepComplete(stepIndex)) {
                      e.preventDefault();
                      collapseStepImmediately(stepIndex);
                      handleNext();
                    }
                  }}
                  onClick={() => handleFieldClick(stepIndex)}
                  onFocus={() => {
                    setFocusedInput(stepIndex);
                    if (currentStep === -1) {
                      setCurrentStep(stepIndex);
                      setVisibleSteps(prev => new Set([...prev, stepIndex]));
                    }
                  }}
                  onBlur={() => {
                    setFocusedInput(null);
                  }}
                  onMouseEnter={() => {
                    if (currentStep === -1 || currentStep === stepIndex) {
                      setFocusedInput(stepIndex);
                    }
                  }}
                  onMouseLeave={() => {
                    if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`input[data-step-index="${stepIndex}"][list]`)) {
                      setFocusedInput(null);
                    }
                  }}
                  data-step-index={stepIndex}
                  placeholder={step.placeholder}
                  className={`flex-1 min-w-0 px-4 py-2 text-base border-2 rounded-xl transition-all duration-200 ${
                    (focusedInput === stepIndex || hoveredStep === stepIndex)
                      ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                      : 'border-gray-200 bg-gray-50'
                  } focus:outline-none placeholder:text-gray-400`}
                />
                <datalist id={`category-options-${stepIndex}`}>
                  {step.options?.map(opt => (
                    <option key={opt} value={opt.charAt(0).toUpperCase() + opt.slice(1).replace(/-/g, ' ')}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1).replace(/-/g, ' ')}
                    </option>
                  ))}
                </datalist>
                {isStepComplete(stepIndex) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium"
                    title="Next"
                  >
                    <span>Next</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {!openDropdowns.has(stepIndex) ? (
                  <textarea
                    value={step.value && step.options ? (() => {
                      const found = step.options.find(opt => opt === step.value);
                      return found ? found.charAt(0).toUpperCase() + found.slice(1).replace(/-/g, ' ') : '';
                    })() : ''}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectInputClick(stepIndex);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isStepComplete(stepIndex)) {
                          e.preventDefault();
                          collapseStepImmediately(stepIndex);
                          handleNext();
                        } else {
                          // If not complete, open dropdown on Enter
                          e.preventDefault();
                          handleSelectInputClick(stepIndex);
                        }
                      }
                    }}
                    onChange={() => {}}
                    readOnly
                    onFocus={() => {
                      setFocusedInput(stepIndex);
                      if (currentStep === -1) {
                        setCurrentStep(stepIndex);
                        setVisibleSteps(prev => new Set([...prev, stepIndex]));
                      }
                    }}
                    onBlur={() => {
                      setFocusedInput(null);
                    }}
                    onMouseEnter={() => {
                      if (currentStep === -1 || currentStep === stepIndex) {
                        setFocusedInput(stepIndex);
                      }
                    }}
                    onMouseLeave={() => {
                      if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`textarea[data-step-index="${stepIndex}"]`)) {
                        setFocusedInput(null);
                      }
                    }}
                    data-step-index={stepIndex}
                    placeholder={step.placeholder}
                    className={`flex-1 min-w-0 px-4 py-2 text-base border-2 rounded-xl transition-all duration-200 cursor-pointer resize-none overflow-hidden min-h-[40px] ${
                      (focusedInput === stepIndex || hoveredStep === stepIndex)
                        ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                        : 'border-gray-200 bg-gray-50'
                    } focus:outline-none placeholder:text-gray-400 placeholder:break-words`}
                    style={{ height: 'auto' }}
                    rows={1}
                  />
                ) : (
                  <select
                    ref={(el) => { selectRefs.current[stepIndex] = el; }}
                    value={step.value || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      handleFieldChange(stepIndex, newValue);
                      // Close dropdown after selection and advance to next step
                      if (newValue) {
                        createTimeout(() => {
                          setOpenDropdowns(prev => {
                            const next = new Set(prev);
                            next.delete(stepIndex);
                            return next;
                          });
                          // Auto-advance to next step after selection
                          createTimeout(() => {
                            handleNext();
                          }, 100);
                        }, 100);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (isStepComplete(stepIndex)) {
                          // Same behavior as Next button - collapse and advance
                          collapseStepImmediately(stepIndex, true);
                          handleNext();
                        } else {
                          // Close dropdown if no selection
                          toggleDropdown(stepIndex);
                        }
                      }
                    }}
                    onFocus={() => {
                      setFocusedInput(stepIndex);
                      if (currentStep === -1) {
                        setCurrentStep(stepIndex);
                        setVisibleSteps(prev => new Set([...prev, stepIndex]));
                      }
                    }}
                    onBlur={() => {
                      setFocusedInput(null);
                      createTimeout(() => toggleDropdown(stepIndex), 200);
                    }}
                    onClick={(e) => {
                      // Ensure dropdown opens on click
                      e.stopPropagation();
                    }}
                    className={`flex-1 min-w-0 px-4 py-3 text-base border-2 rounded-xl transition-all duration-200 max-w-full ${
                      (focusedInput === stepIndex || hoveredStep === stepIndex)
                        ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                        : 'border-gray-200 bg-gray-50'
                    } focus:outline-none`}
                    style={{ maxWidth: '100%' }}
                    autoFocus={true}
                  >
                    <option value="">{step.placeholder}</option>
                    {step.options?.map(opt => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </>
        )}
        
        {step.type === 'textarea' && (
          <>
            <textarea
              ref={(el) => { inputRefs.current[stepIndex] = el; }}
              value={step.value}
              onChange={(e) => {
                handleFieldChange(stepIndex, e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onClick={() => handleFieldClick(stepIndex)}
              onFocus={() => {
                setFocusedInput(stepIndex);
                if (currentStep === -1) {
                  setCurrentStep(stepIndex);
                  setVisibleSteps(prev => new Set([...prev, stepIndex]));
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
              }}
              onMouseEnter={() => {
                if (currentStep === -1 || currentStep === stepIndex) {
                  setFocusedInput(stepIndex);
                }
              }}
              onMouseLeave={() => {
                if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`textarea[data-step-index="${stepIndex}"]`)) {
                  setFocusedInput(null);
                }
              }}
              onKeyDown={(e) => {
                // Enter key advances when complete, Shift+Enter for new line
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (isStepComplete(stepIndex)) {
                    e.preventDefault();
                    collapseStepImmediately(stepIndex);
                    handleNext();
                  }
                }
              }}
              placeholder={step.placeholder}
              data-step-index={stepIndex}
              rows={1}
                className={`flex-1 min-w-0 px-4 py-2 text-base border-2 rounded-xl transition-all duration-200 resize-none overflow-hidden min-h-[40px] max-h-[200px] ${
                (focusedInput === stepIndex || hoveredStep === stepIndex)
                  ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                  : 'border-gray-200 bg-gray-50'
              } focus:outline-none placeholder:text-gray-400`}
              style={{ height: 'auto' }}
            />
            {showNextButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium self-start"
                title="Next"
              >
                <span>Next</span>
              </button>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Render research step
  const renderResearchStep = () => {
    // If estimate exists, always show research step (it'll be collapsed)
    if (!estimate && !visibleSteps.has(RESEARCH_STEP_INDEX)) return null;
    
    const isActive = currentStep === RESEARCH_STEP_INDEX;
    const isComplete = isStepComplete(RESEARCH_STEP_INDEX);
    const isCollapsed = collapsedSteps.has(RESEARCH_STEP_INDEX) && !isActive;
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
    
    // Collapsed view - show KPI by default
    // When estimate exists, show collapsed view if research is complete
    if ((isCollapsed && !isActive) || (estimate && isComplete)) {
      return (
        <div
          ref={(el) => { stepRefs.current[RESEARCH_STEP_INDEX] = el; }}
          key="research-step"
          className="transition-all duration-300 ease-out w-full cursor-pointer group/item"
          onMouseEnter={() => setHoveredStep(RESEARCH_STEP_INDEX)}
          onMouseLeave={() => setHoveredStep(null)}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleResetStep(RESEARCH_STEP_INDEX);
          }}
        >
          {/* Show KPI as default collapsed state */}
          {displayResearch.kpi && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">KPI</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-gray-900">Predicted Success Metric</h4>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                      KPI 1
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {displayResearch.kpi.name}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {displayResearch.kpi.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Target:</span>
                    <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                      {displayResearch.kpi.exampleValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Full expanded view (active or not collapsed)
    // When estimate exists, always show research step (even if not active)
    const shouldShow = estimate || isActive || isComplete;
    return (
      <div
        ref={(el) => { stepRefs.current[RESEARCH_STEP_INDEX] = el; }}
        key="research-step"
        className={`transition-all duration-500 ease-out w-full focus:outline-none ${
          !shouldShow
            ? 'opacity-0 -translate-y-4 scale-95 pointer-events-none h-0 overflow-hidden'
            : isActive
            ? 'opacity-100 translate-y-0 scale-100'
            : isComplete || estimate
            ? 'opacity-60 translate-y-0 scale-[0.98]'
            : 'opacity-0 -translate-y-4 scale-95 pointer-events-none h-0 overflow-hidden'
        }`}
        style={{
          animation: isActive && !isComplete ? 'materialFadeIn 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)' : undefined,
        }}
        tabIndex={isActive ? 0 : -1}
        onKeyDown={(e) => {
          // Enter key advances to next step (same as Next button)
          if (e.key === 'Enter' && isComplete && isActive) {
            e.preventDefault();
            e.stopPropagation();
            collapseStepImmediately(RESEARCH_STEP_INDEX);
            handleNext();
          }
        }}
        onMouseLeave={() => {
          // If this is a collapsed step that was hovered, collapse it when mouse leaves
          if (isCollapsed && hoveredStep === RESEARCH_STEP_INDEX) {
            setHoveredStep(null);
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Research · Strategic Market Review</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Market fit & competitive evaluation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Using your project name and summary, we infer the most relevant market, scan similar initiatives,
              and synthesize best practices so the proposal is grounded in real competitive context.
            </p>
          </div>
          
          {/* KPI Prediction Banner */}
          {displayResearch.kpi && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">KPI</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-gray-900">Predicted Success Metric</h4>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                      KPI 1
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {displayResearch.kpi.name}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {displayResearch.kpi.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Target:</span>
                    <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                      {displayResearch.kpi.exampleValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Context */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Market context</h4>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-blue-700">Active</span>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.marketSummary}</p>
            </div>

            {/* Competitive Landscape */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Competitive landscape</h4>
                <div className="px-2 py-1 bg-amber-100 rounded-full">
                  <span className="text-[10px] font-semibold text-amber-700">
                    {displayResearch.metrics.competitiveIntensity}/100
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.competitiveLandscape}</p>
            </div>

            {/* Best Practice Signals */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Best‑practice signals</h4>
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                  <span className="text-[10px] font-semibold text-purple-700">
                    {Math.round(displayResearch.metrics.uxElevationNeeded * 0.85)}% adoption
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.bestPractices}</p>
            </div>

            {/* Strategic Recommendation */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Strategic recommendation</h4>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <span className="text-[10px] font-semibold text-green-700">
                    {Math.round((displayResearch.metrics.differentiationOpportunity + 20) * 0.9)}% confidence
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{displayResearch.strategicRecommendations}</p>
            </div>
          </div>
          
          {isComplete && (
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  collapseStepImmediately(RESEARCH_STEP_INDEX);
                  handleNext();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium"
                title="Next"
              >
                <span>Next</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render a discovery question
  const renderQuestion = (questionIndex: number, question: Question) => {
    const stepIndex = RESEARCH_STEP_INDEX + 1 + questionIndex; // +1 for research step
    // Show questions if:
    // 1. Estimate exists (they'll be collapsed), OR
    // 2. This specific question is in visibleSteps (progressive display - one at a time)
    if (!estimate && !visibleSteps.has(stepIndex)) return null;
    
    const isActive = currentStep === stepIndex;
    const answer = answers.find(a => a.questionId === question.id);
    const isComplete = isStepComplete(stepIndex);
    const isCollapsed = collapsedSteps.has(stepIndex) && (currentStep === -1 || !isActive);
    const isHovered = hoveredStep === stepIndex;
    
    // Collapsed view
    if (isCollapsed && !isHovered && !isActive) {
      let displayValue = '';
      if (answer) {
        if (question.type === 'multi-select' && Array.isArray(answer.value)) {
          displayValue = answer.value.join(', ');
        } else {
          displayValue = String(answer.value);
        }
      }
      
      return (
        <div
          ref={(el) => { stepRefs.current[stepIndex] = el; }}
          key={question.id}
          className="transition-all duration-300 ease-out flex items-center gap-3 min-w-0 w-full cursor-pointer group/item"
          onMouseEnter={() => setHoveredStep(stepIndex)}
          onMouseLeave={() => setHoveredStep(null)}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleResetStep(stepIndex);
          }}
        >
          <div className="flex-1 min-w-0 px-4 py-2 text-sm border-2 border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-medium">{question.text}:</span>
              <span className="text-gray-700 font-medium truncate ml-2">{displayValue}</span>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div
        ref={(el) => { stepRefs.current[stepIndex] = el; }}
        key={question.id}
        className={`transition-all duration-500 ease-out flex items-center gap-3 min-w-0 w-full ${
          (isActive || focusedInput === stepIndex)
            ? 'opacity-100 translate-y-0 scale-100'
            : isComplete
            ? 'opacity-60 translate-y-0 scale-[0.98]'
            : visibleSteps.has(stepIndex)
            ? 'opacity-100 translate-y-0 scale-100' // Show question if it's in visibleSteps
            : 'opacity-0 -translate-y-4 scale-95 pointer-events-none h-0 overflow-hidden'
        }`}
        style={{
          animation: isActive && !isComplete ? 'materialFadeIn 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)' : undefined,
        }}
        onMouseLeave={() => {
          // Always clear hover state when mouse leaves, which will collapse if it was hovered
          if (hoveredStep === stepIndex) {
            setHoveredStep(null);
          }
        }}
      >
        {question.type === 'text' && (
          <>
            <input
              ref={(el) => { inputRefs.current[stepIndex] = el; }}
              type="text"
              value={(answer?.value as string) || ''}
              onChange={(e) => handleQuestionAnswer(question, e.target.value)}
              onClick={() => handleFieldClick(stepIndex)}
              onFocus={() => {
                setFocusedInput(stepIndex);
                if (currentStep === -1) {
                  setCurrentStep(stepIndex);
                  setVisibleSteps(prev => new Set([...prev, stepIndex]));
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
              }}
              onMouseEnter={() => {
                if (currentStep === -1 || currentStep === stepIndex) {
                  setFocusedInput(stepIndex);
                }
              }}
              onMouseLeave={() => {
                if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`input[data-question-id="${question.id}"]`)) {
                  setFocusedInput(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const currentValue = e.currentTarget.value;
                  // Ensure answer is saved first if it has changed
                  if (currentValue && (!answer || answer.value !== currentValue)) {
                    handleQuestionAnswer(question, currentValue);
                  }
                  // Check if complete (using current input value, not just state)
                  if (currentValue && currentValue.trim() !== '') {
                    // Force completion check update
                    createTimeout(() => {
                      const isComplete = allStepsComplete();
                      setAllComplete(isComplete);
                    }, 100);
                    collapseStepImmediately(stepIndex, true);
                    handleNext();
                  }
                }
              }}
              placeholder={question.text}
              data-question-id={question.id}
              className={`flex-1 px-4 py-3 text-base border-2 rounded-xl transition-all duration-200 ${
                (focusedInput === stepIndex || hoveredStep === stepIndex)
                  ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                  : 'border-gray-200 bg-gray-50'
              } focus:outline-none placeholder:text-gray-400 placeholder:break-words`}
            />
            {isStepComplete(stepIndex) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium"
                title="Next"
              >
                <span>Next</span>
              </button>
            )}
          </>
        )}
          
          {question.type === 'select' && (
            <>
              {!openDropdowns.has(stepIndex) && !answer?.value ? (
                <textarea
                  onClick={() => toggleQuestionDropdown(questionIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      toggleQuestionDropdown(questionIndex);
                    }
                  }}
                  readOnly
                  placeholder={question.text}
                  value=""
                  onChange={() => {}}
                  onFocus={() => {
                    setFocusedInput(stepIndex);
                    if (currentStep === -1) {
                      setCurrentStep(stepIndex);
                      setVisibleSteps(prev => new Set([...prev, stepIndex]));
                    }
                  }}
                  onBlur={() => {
                    setFocusedInput(null);
                  }}
                  onMouseEnter={() => {
                    if (currentStep === -1 || currentStep === stepIndex) {
                      setFocusedInput(stepIndex);
                    }
                  }}
                  onMouseLeave={() => {
                    if (focusedInput === stepIndex && document.activeElement !== document.querySelector(`textarea[data-question-id="${question.id}"]`)) {
                      setFocusedInput(null);
                    }
                  }}
                  data-question-id={question.id}
                  className={`flex-1 min-w-0 px-4 py-2 text-base border-2 rounded-xl transition-all duration-200 cursor-pointer resize-none overflow-hidden min-h-[40px] ${
                    (focusedInput === stepIndex || hoveredStep === stepIndex)
                      ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                      : 'border-gray-200 bg-gray-50'
                  } focus:outline-none placeholder:text-gray-400 placeholder:break-words`}
                  style={{ height: 'auto' }}
                  rows={1}
                />
              ) : (
                <>
                  <select
                    ref={(el) => { selectRefs.current[stepIndex] = el; }}
                    value={(answer?.value as string) || ''}
                    data-question-id={question.id}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // Save answer immediately
                      handleQuestionAnswer(question, newValue);
                      // Force completion check update after state settles
                      if (newValue && newValue.trim() !== '') {
                        // Immediately check if this step is complete
                        const stepComplete = isStepComplete(stepIndex);
                        if (stepComplete) {
                          setCollapsedSteps(prev => {
                            if (!prev.has(stepIndex)) {
                              return new Set([...prev, stepIndex]);
                            }
                            return prev;
                          });
                        }
                        // Then check all steps completion - do this immediately and with delay
                        const immediateComplete = allStepsComplete();
                        setAllComplete(immediateComplete);
                        createTimeout(() => {
                          const isComplete = allStepsComplete();
                          setAllComplete(isComplete);
                        }, 200); // Also check after delay to catch any state updates
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const currentValue = e.currentTarget.value;
                        if (currentValue) {
                          // Ensure answer is saved first
                          if (!answer || answer.value !== currentValue) {
                            handleQuestionAnswer(question, currentValue);
                          }
                          // Then check completion and advance immediately (same as Next button)
                          if (isStepComplete(stepIndex)) {
                            // Force completion check update
                            createTimeout(() => {
                              const isComplete = allStepsComplete();
                              setAllComplete(isComplete);
                            }, 100);
                            collapseStepImmediately(stepIndex, true);
                            handleNext();
                          }
                        } else {
                          // If no value, just open dropdown
                          toggleQuestionDropdown(questionIndex);
                        }
                      }
                    }}
                    onFocus={() => {
                      setFocusedInput(stepIndex);
                      if (currentStep === -1) {
                        setCurrentStep(stepIndex);
                        setVisibleSteps(prev => new Set([...prev, stepIndex]));
                      }
                    }}
                    onBlur={() => {
                      setFocusedInput(null);
                      createTimeout(() => toggleQuestionDropdown(questionIndex), 200);
                    }}
                    onClick={(e) => {
                      // Ensure dropdown opens on click
                      e.stopPropagation();
                    }}
                    className={`flex-1 min-w-0 px-4 py-3 text-base border-2 rounded-xl transition-all duration-200 max-w-full ${
                      (focusedInput === stepIndex || hoveredStep === stepIndex)
                        ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                        : 'border-gray-200 bg-gray-50'
                    } focus:outline-none`}
                    style={{ maxWidth: '100%' }}
                    autoFocus={openDropdowns.has(stepIndex)}
                  >
                    <option value="">{question.text}</option>
                    {question.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {(() => {
                    // Check completion - use current select value directly to avoid state timing issues
                    const currentValue = (answer?.value as string) || '';
                    const isComplete = currentValue !== '' && currentValue !== undefined;
                    
                    if (isComplete) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Always ensure answer is saved before advancing
                            const selectEl = selectRefs.current[stepIndex];
                            if (selectEl?.value) {
                              // Save the answer first
                              handleQuestionAnswer(question, selectEl.value);
                              
                              // Check if this is the last question
                              const totalSteps = BASIC_STEPS.length + 1 + (questions.length > 0 ? questions.length : 0);
                              const isLastStep = stepIndex === totalSteps - 1;
                              
                              if (isLastStep) {
                                // For last step, collapse immediately without advancing
                                // First, clear currentStep so the step can be collapsed (isCollapsed requires !isActive)
                                setCurrentStep(-1);
                                
                                createTimeout(() => {
                                  // First, collapse this step
                                  setCollapsedSteps(prev => new Set([...prev, stepIndex]));
                                  
                                  // Then collapse all other completed steps
                                  const allStepIndices: number[] = [
                                    ...BASIC_STEPS.map((_, idx) => idx),
                                    RESEARCH_STEP_INDEX,
                                    ...questions.map((_, idx) => RESEARCH_STEP_INDEX + 1 + idx)
                                  ];
                                  
                                  setCollapsedSteps(prev => {
                                    const newCollapsed = new Set(prev);
                                    allStepIndices.forEach(sIdx => {
                                      if (isStepComplete(sIdx)) {
                                        newCollapsed.add(sIdx);
                                      }
                                    });
                                    return newCollapsed;
                                  });
                                  
                                  // Force completion check update after all state has settled
                                  createTimeout(() => {
                                    const isComplete = allStepsComplete();
                                    setAllComplete(isComplete);
                                  }, 200);
                                }, 150);
                              } else {
                                // For non-last steps, use normal handleNext
                                createTimeout(() => {
                                  setCollapsedSteps(prev => new Set([...prev, stepIndex]));
                                  handleNext();
                                }, 100);
                              }
                            } else {
                              handleNext();
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium"
                          title="Next"
                        >
                          <span>Next</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </>
          )}
          
          {question.type === 'multi-select' && (
            <>
              {!openDropdowns.has(stepIndex) && (!answer?.value || (Array.isArray(answer.value) && answer.value.length === 0)) ? (
                <input
                  type="text"
                  onClick={() => {
                    handleFieldClick(stepIndex);
                    toggleQuestionDropdown(questionIndex);
                  }}
                  readOnly
                  placeholder={question.text}
                  className={`flex-1 px-4 py-3 text-base border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-white shadow-lg focus:ring-4 focus:ring-blue-500/20'
                      : 'border-gray-200 bg-gray-50'
                  } focus:outline-none placeholder:text-gray-400`}
                  autoFocus={isActive}
                />
              ) : (
                <>
                  <div className="flex-1 space-y-2">
                    {question.options?.map(opt => {
                      const selected = Array.isArray(answer?.value) && answer.value.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const current = Array.isArray(answer?.value) ? answer.value : [];
                              const updated = e.target.checked
                                ? [...current, opt]
                                : current.filter(v => v !== opt);
                              handleQuestionAnswer(question, updated);
                              // Auto-open dropdown when first option is selected
                              if (!openDropdowns.has(stepIndex) && updated.length > 0) {
                                toggleQuestionDropdown(questionIndex);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                  {isStepComplete(stepIndex) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm text-white font-medium self-start"
                      title="Next"
                    >
                      <span>Next</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}
      </div>
    );
  };
  
  return (
    <>
      <style>{`
        @keyframes materialFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Molten Gold Flow Animation */
        @keyframes moltenFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        /* Shimmer Wave Animation */
        @keyframes shimmerWave {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        
        /* Alternative: Bubble Float Animation (for Treatment 2) */
        @keyframes bubbleFloat {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.6;
          }
        }
        
        /* Alternative: Sparkle Animation (for Treatment 3) */
        @keyframes sparkle {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 20px 20px;
          }
        }
        
        /* Slide Down Animation for Generate Estimate Button */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Slide Left Animation for Cards - moves 200px left */
        @keyframes slideLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-200px);
          }
        }
        
        /* Slide In Right Animation for Estimate */
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      
      {/* Container: Two-column layout when estimate exists, single column otherwise */}
      <div className={`w-full ${estimate ? 'flex flex-row flex-nowrap gap-8 items-start justify-center' : ''}`}>
        {/* Left Column: Cards and Button - 30% width when estimate appears */}
        <div 
          className={estimate ? 'flex-shrink-0 flex flex-col' : 'w-full'}
          style={estimate ? { 
            width: '30%',
            minWidth: '30%',
            maxWidth: '30%'
          } : {}}
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFD700] via-blue-400 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/20 overflow-hidden w-full">
          {/* Progress Bar - flush to top - only show after first question is answered */}
          {(() => {
            // Only show progress bar if the first field (jobTitle) is completed
            // This ensures it doesn't show on initial load when only default values exist
            const firstFieldComplete = isStepComplete(0); // jobTitle is index 0
            if (!firstFieldComplete) return null;
            
            // Use completion state to show 100% when all steps are complete
            const progress = calculateProgress();
            const displayProgress = allComplete ? 100 : progress;
            
            return (
              <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200/50 overflow-hidden rounded-t-2xl z-10">
                <div 
                  className="h-full bg-gradient-to-r from-[#FFD700] via-blue-400 to-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            );
          })()}
          <div className="space-y-3 min-w-0 w-full flex flex-col relative z-0">
            {/* Basic fields */}
            {BASIC_STEPS.map((step, idx) => renderBasicField(idx, step))}
            
            {/* Research step */}
            {renderResearchStep()}
            
            {/* Discovery questions - removed from main card, now in separate card below */}
          </div>
            </div>
          </div>
        
          {/* Questions Card - appears below main card after research is completed and user has moved past it */}
          {/* CRITICAL: If estimate exists, ALWAYS show the card - no conditions */}
          {(() => {
            // If estimate exists, ALWAYS show the questions card (user has completed everything)
            // This is the simplest condition - if estimate exists and questions exist, show it
            if (estimate && questions.length > 0) {
              return true;
            }
            
            // Otherwise, use strict conditions (when estimate doesn't exist yet)
            const researchComplete = isStepComplete(RESEARCH_STEP_INDEX);
            const researchCollapsed = collapsedSteps.has(RESEARCH_STEP_INDEX);
            const hasMovedPastResearch = currentStep > RESEARCH_STEP_INDEX;
            const isOnDiscoveryQuestion = currentStep >= RESEARCH_STEP_INDEX + 1;
            const hasQuestions = questions.length > 0;
            
            if (!hasMovedPastResearch && !isOnDiscoveryQuestion) {
              const allQuestionsComplete = questions.every((_, idx) => {
                const qStepIndex = RESEARCH_STEP_INDEX + 1 + idx;
                return isStepComplete(qStepIndex);
              });
              if (!allQuestionsComplete) return false;
            }
            
            // CRITICAL: Once questions card is shown, keep it visible if any questions are complete
            // This prevents the card from disappearing when user is on last question
            const hasAnyCompleteQuestions = questions.some((_, idx) => {
              const qStepIndex = RESEARCH_STEP_INDEX + 1 + idx;
              return isStepComplete(qStepIndex);
            });
            
            // Show if: card was shown AND (has moved past research OR has any complete questions)
            const shouldShowCard = showQuestionsCard && hasQuestions && researchComplete && researchCollapsed && 
              (hasMovedPastResearch || isOnDiscoveryQuestion || hasAnyCompleteQuestions);
            
            return shouldShowCard;
          })() && questions.length > 0 && (
            <div 
              className="relative group mt-6"
              style={{ 
                animation: 'slideDown 0.7s ease-out forwards'
              }}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFD700] via-blue-400 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/20 overflow-hidden w-full">
                <div className="space-y-3 min-w-0 w-full flex flex-col relative z-0">
                  {/* Discovery questions */}
                  {questions.length > 0 && questions.map((question, idx) => renderQuestion(idx, question))}
                </div>
              </div>
            </div>
          )}
        
        {/* Generate Estimate Button - Separate container outside the card */}
        {(() => {
              // Check completion directly (more reliable than state)
              const isComplete = allStepsComplete();
              const progress = calculateProgress();
              
              // Show button if all steps are complete
              // Also check if first field is complete as a fallback (for early visibility)
              const firstFieldComplete = isStepComplete(0); // jobTitle is index 0
              
              // Show button if:
              // 1. All steps are complete, OR
              // 2. First field is complete (regardless of collapse state - show early)
              // This ensures button appears early (after first question) and stays visible when all complete
              const shouldShow = isComplete || firstFieldComplete;
              if (!shouldShow) {
                return null;
              }
              
              // When complete, progress should be 100%
              const displayProgress = isComplete ? 100 : progress;
              
              return (
                <div 
                  style={{ 
                    paddingTop: '12px', 
                    marginTop: '12px',
                    animation: 'slideDown 0.7s ease-out forwards'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Double-check completion at click time
                      const clickTimeComplete = allStepsComplete();
                      
                      if (!clickTimeComplete) {
                        return;
                      }
                      
                      const newEstimate = onGenerateEstimate();
                      if (newEstimate && setEstimate) {
                        // Ensure questions card stays visible when estimate is generated
                        setShowQuestionsCard(true);
                        // Ensure all questions are visible
                        setVisibleSteps(prev => {
                          const newSet = new Set(prev);
                          questions.forEach((_, idx) => {
                            const stepIndex = RESEARCH_STEP_INDEX + 1 + idx;
                            newSet.add(stepIndex);
                          });
                          return newSet;
                        });
                        setEstimate(newEstimate);
                      }
                    }}
                    disabled={!isComplete}
                    className={`w-full group relative flex items-center justify-center px-8 py-5 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl overflow-hidden ${
                      isComplete
                        ? 'hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] text-black hover:from-[#FFC700] hover:via-[#FFD700] hover:to-[#FFC700] hover:shadow-[#FFD700]/50 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {/* TREATMENT 1: Molten Gold with Animated Flow & Progressive Glow - ACTIVE */}
                    <div
                      className="absolute inset-0 transition-all duration-500 ease-out overflow-hidden"
                      style={{ 
                        width: `${displayProgress}%`,
                      }}
                    >
                      {/* Base molten gold gradient */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFA500] via-[#FFD700] to-[#FFA500]"
                        style={{
                          backgroundSize: '200% 100%',
                          animation: 'moltenFlow 3s ease-in-out infinite',
                          opacity: 0.7 + (displayProgress / 100) * 0.3, // Gets brighter as progress increases
                        }}
                      />
                      
                      {/* Animated shimmer wave */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{
                          backgroundSize: '200% 100%',
                          animation: 'shimmerWave 2s ease-in-out infinite',
                          transform: 'translateX(-100%)',
                        }}
                      />
                      
                      {/* Progressive glow that intensifies with progress */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          boxShadow: `0 0 ${20 + (displayProgress / 100) * 40}px rgba(255, 215, 0, ${0.4 + (displayProgress / 100) * 0.6})`,
                          filter: `brightness(${1 + (displayProgress / 100) * 0.5})`,
                        }}
                      />
                    </div>
                    
                    {/* TREATMENT 2: Liquid Fill with Bubbles (Alternative - commented out) */}
                    {/* Uncomment to try this treatment instead:
                    <div
                      className="absolute inset-0 transition-all duration-500 ease-out overflow-hidden"
                      style={{ width: `${displayProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700] via-[#FFA500] to-[#FF8C00]" />
                      <div 
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 2px, transparent 2px)',
                          backgroundSize: '30px 30px',
                          animation: 'bubbleFloat 4s ease-in-out infinite',
                        }}
                      />
                      <div 
                        className="absolute inset-0"
                        style={{
                          boxShadow: `inset 0 0 ${30 + (displayProgress / 100) * 50}px rgba(255, 215, 0, ${0.5 + (displayProgress / 100) * 0.5})`,
                          filter: `brightness(${1 + (displayProgress / 100) * 0.3})`,
                        }}
                      />
                      <div 
                        className="absolute inset-0"
                        style={{
                          boxShadow: `0 0 ${15 + (displayProgress / 100) * 35}px rgba(255, 165, 0, ${0.3 + (displayProgress / 100) * 0.7})`,
                        }}
                      />
                    </div>
                    */}
                    
                    {/* TREATMENT 3: Particle Sparkle (Alternative - commented out) */}
                    {/* Uncomment to try this treatment instead:
                    <div
                      className="absolute inset-0 transition-all duration-500 ease-out overflow-hidden"
                      style={{ width: `${displayProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700]" />
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0',
                          animation: 'sparkle 1.5s linear infinite',
                          opacity: 0.3 + (displayProgress / 100) * 0.7,
                        }}
                      />
                      <div 
                        className="absolute inset-0"
                        style={{
                          boxShadow: `0 0 ${15 + (displayProgress / 100) * 35}px rgba(255, 215, 0, ${0.3 + (displayProgress / 100) * 0.7})`,
                          filter: `brightness(${1 + (displayProgress / 100) * 0.4})`,
                        }}
                      />
                    </div>
                    */}
                    
                    {/* Shimmer effect - only when complete */}
                    {isComplete && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                    )}
                    
                    <span className="relative flex items-center gap-3 z-10">
                      {isComplete && (
                        <>
                          {estimate ? 'Regenerate Estimate' : 'Generate Estimate'}
                          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              );
            })()}
        </div>
        
        {/* Right Column: Estimate Visualization - 30% width */}
        {estimate && setEstimate ? (
          <div 
            className="flex-shrink-0"
            data-estimate-section
            style={{ 
              animation: 'slideInRight 0.7s ease-out forwards',
              width: '30%',
              minWidth: '30%',
              maxWidth: '30%'
            }}
          >
            <EstimateVisualization
            tasks={estimate.tasks}
            timeline={estimate.timeline}
            totalHours={estimate.totalHours}
            onTaskMultiplierChange={onTaskMultiplierChange || (() => {})}
            onTasksChange={(updatedTasks) => {
              // Update estimate with new task selections
              const newTotalHours = updatedTasks
                .filter((t) => t.selected !== false)
                .reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
              
              // Recalculate timeline based on new total hours
              const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference' || a.questionId === 'timeline-urgency');
              const timelineWeeks = calculateTimeline(newTotalHours, timelineAnswer?.value as string | undefined);
              
              setEstimate({
                ...estimate,
                tasks: updatedTasks,
                totalHours: newTotalHours,
                timeline: timelineWeeks,
              });
            }}
            projectName={projectName}
            projectSummary={projectContext}
            answers={answers}
            marketResearch={marketResearch}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
