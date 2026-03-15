import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Task } from '../types';
import { Calendar, CheckCircle2, Circle, Download, FileText, Plus, X, MoreVertical, Trash2, Edit2, GripVertical } from 'lucide-react';
import { TimelineCalendar } from './TimelineCalendar';
import { exportToSOWPDF } from '../utils/exportToPDF';
import { calculateTimeline } from '../utils/estimateEngine';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailjs';

// 3D Visualization - uncomment when @react-three/fiber is installed
// import { Sphere3DVisualization } from './Sphere3DVisualization';

import { Answer } from '../types';
import { MarketResearchResult } from '../utils/marketResearch';

interface EstimateVisualizationProps {
  tasks: Task[];
  totalHours: number;
  timeline: { weeks: number; startDate: Date; endDate: Date };
  onTaskMultiplierChange: (taskId: string, multiplier: number) => void;
  onTasksChange?: (updatedTasks: Task[]) => void;
  projectName?: string;
  projectSummary?: string;
  answers?: Answer[];
  marketResearch?: MarketResearchResult | null;
}

// Task Hours Breakdown bar colors: original blue → purple/pink palette
const COLORS = [
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#ef4444',
];

export function EstimateVisualization({
  tasks,
  totalHours: _totalHours, // Keep for backward compatibility
  timeline: _timeline, // Keep for backward compatibility but use calculatedTimeline instead
  onTaskMultiplierChange,
  onTasksChange,
  projectName = 'Project',
  projectSummary = '',
  answers = [],
  marketResearch = null,
}: EstimateVisualizationProps) {
  const [editableSummary, setEditableSummary] = useState<string>('');
  // Local tasks state that includes custom tasks
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks || []);

  // Update local tasks when props change
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setLocalTasks(tasks);
    }
  }, [tasks]);

  // Initialize selected state - all tasks selected by default
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set((tasks || []).map((t) => t.id))
  );
  
  // Update selected task IDs when local tasks change
  useEffect(() => {
    if (localTasks.length > 0) {
      setSelectedTaskIds(new Set(localTasks.map((t) => t.id)));
    }
  }, [localTasks.length]); // Only when tasks are added/removed
  
  // State for adding new tasks
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(10);
  const [newTaskCategory, setNewTaskCategory] = useState('Custom');
  
  // State for task editing and dropdowns
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskHours, setEditTaskHours] = useState<number>(0);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // State for drag and drop reordering
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Update tasks with selected state
  const tasksWithSelection = useMemo(() => {
    return localTasks.map((task) => ({
      ...task,
      selected: selectedTaskIds.has(task.id),
    }));
  }, [localTasks, selectedTaskIds]);

  // Calculate selected total hours - update in real-time
  const selectedTotalHours = useMemo(() => {
    return tasksWithSelection
      .filter((task) => task.selected !== false) // Default to true if undefined
      .reduce((sum, task) => sum + task.baseHours * task.multiplier, 0);
  }, [tasksWithSelection]);

  // Calculate timeline based on selected hours - updates in real-time
  const calculatedTimeline = useMemo(() => {
    const timelineAnswer = answers.find((a) => a.questionId === 'timeline-preference' || a.questionId === 'timeline-urgency');
    const timelineValue = timelineAnswer?.value as string | undefined;
    return calculateTimeline(selectedTotalHours, timelineValue);
  }, [selectedTotalHours, answers]);

  // Group tasks by category/milestone for horizontal breakdown
  const milestoneData = useMemo(() => {
    const categoryMap = new Map<string, { total: number; selected: number; tasks: Task[] }>();
    
    tasksWithSelection.forEach((task) => {
      const existing = categoryMap.get(task.category) || { total: 0, selected: 0, tasks: [] };
      const taskHours = task.baseHours * task.multiplier;
      existing.total += taskHours;
      if (task.selected) {
        existing.selected += taskHours;
      }
      existing.tasks.push(task);
      categoryMap.set(task.category, existing);
    });

    const totalAll = tasksWithSelection.reduce((sum, t) => sum + t.baseHours * t.multiplier, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalHours: data.total,
        selectedHours: data.selected,
        percentage: totalAll > 0 ? (data.total / totalAll) * 100 : 0,
        selectedPercentage: selectedTotalHours > 0 ? (data.selected / selectedTotalHours) * 100 : 0,
        tasks: data.tasks,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [tasksWithSelection, selectedTotalHours]);

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
    
    // Update parent if callback provided
    if (onTasksChange) {
      const updated = localTasks.map((t) => ({
        ...t,
        selected: newSelected.has(t.id),
      }));
      onTasksChange(updated);
    }
  };

  const handleTaskHoursChange = (taskId: string, newHours: number) => {
    const task = localTasks.find(t => t.id === taskId);
    if (task) {
      const newMultiplier = newHours / task.baseHours;
      onTaskMultiplierChange(taskId, newMultiplier);
      
      // Update local tasks
      setLocalTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, multiplier: newMultiplier } : t
      ));
    }
  };

  const handleAddTask = () => {
    if (newTaskName.trim() && newTaskHours > 0) {
      const newTask: Task = {
        id: `custom-${Date.now()}`,
        name: newTaskName.trim(),
        baseHours: newTaskHours,
        multiplier: 1,
        category: newTaskCategory,
        selected: true,
      };
      
      const updatedTasks = [...localTasks, newTask];
      setLocalTasks(updatedTasks);
      setSelectedTaskIds(prev => new Set([...prev, newTask.id]));
      
      // Notify parent if callback provided
      if (onTasksChange) {
        onTasksChange(updatedTasks);
      }
      
      // Reset form
      setNewTaskName('');
      setNewTaskHours(10);
      setNewTaskCategory('Custom');
      setShowAddTask(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = localTasks.filter(t => t.id !== taskId);
    setLocalTasks(updatedTasks);
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    
    if (onTasksChange) {
      onTasksChange(updatedTasks);
    }
    
    setOpenDropdownId(null);
  };

  const handleStartEdit = (taskId: string, currentHours: number) => {
    setEditingTaskId(taskId);
    setEditTaskHours(currentHours);
    setOpenDropdownId(null);
  };

  const handleSaveEdit = (taskId: string) => {
    if (editTaskHours > 0) {
      handleTaskHoursChange(taskId, editTaskHours);
    }
    setEditingTaskId(null);
    setEditTaskHours(0);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTaskHours(0);
  };


  const [problemStatement, setProblemStatement] = useState<string>('');
  const [measureOfSuccess, setMeasureOfSuccess] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Section collapse/expand state
  const [isSection1Open, setIsSection1Open] = useState(true); // Default open
  const [isSection2Open, setIsSection2Open] = useState(false); // Default closed
  const [isSection3Open, setIsSection3Open] = useState(false); // Default closed

  // Generate initial summary, problem statement, and measures of success from answers + market research
  useEffect(() => {
    if (answers.length > 0) {
      const generatedSummary = generateSummaryFromAnswers(projectName, projectSummary, answers);
      setEditableSummary(generatedSummary);
      
      // Extract problem statement
      const problem = extractProblemStatement(projectName, projectSummary, answers);
      setProblemStatement(problem);
      
      // Extract measures of success
      const success = extractMeasuresOfSuccess(answers);
      setMeasureOfSuccess(success);
    } else if (!editableSummary) {
      const baseSummary =
        projectSummary || `This proposal outlines the scope, timeline, and investment for ${projectName}.`;
      const marketLine = marketResearch
        ? ` This engagement is grounded in a review of the target market, competitive landscape, and best‑practice signals to ensure the solution stands out meaningfully.`
        : '';
      setEditableSummary(baseSummary + marketLine);

      const baseProblem =
        projectSummary ||
        `The project aims to address key business challenges and opportunities for ${projectName}.`;
      const problemLine = marketResearch
        ? ` In the current competitive context, the primary challenge is to differentiate through clarity, experience quality, and measurable outcomes.`
        : '';
      setProblemStatement(baseProblem + problemLine);

      const successLine = marketResearch
        ? 'Success will be measured by how effectively the experience outperforms comparable offerings—through engagement, conversion, and perceived brand quality.'
        : 'Success will be measured through improved business metrics, user engagement, and achievement of project objectives.';
      setMeasureOfSuccess(successLine);
    }
  }, [answers, projectName, projectSummary, marketResearch]);

  // Auto-resize textareas on mount and when content changes
  useEffect(() => {
    const resizeTextarea = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const textareas = document.querySelectorAll('textarea[class*="resize-y"]');
    textareas.forEach((textarea) => {
      resizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [editableSummary, problemStatement, measureOfSuccess]);

  // Extract problem statement from answers
  function extractProblemStatement(projectName: string, projectSummary: string, answers: Answer[]): string {
    const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
    
    // First, try to get explicit problem statement
    const problemAnswer = answerMap.get('problem-statement');
    if (problemAnswer && typeof problemAnswer === 'string' && problemAnswer.trim()) {
      return problemAnswer.trim();
    }
    
    // Fall back to project summary if it exists
    if (projectSummary && projectSummary.trim()) {
      return projectSummary.trim();
    }
    
    // Synthesize from current state and project scope
    const currentState = answerMap.get('current-state');
    const projectScope = answerMap.get('project-scope');
    
    let problem = `${projectName} requires `;
    
    if (currentState && typeof currentState === 'string') {
      if (currentState.includes('Starting from scratch')) {
        problem += 'a new digital presence to establish market presence and drive growth.';
      } else if (currentState.includes('overhaul') || currentState.includes('complete overhaul')) {
        problem += 'a comprehensive transformation to modernize and improve existing systems.';
      } else if (currentState.includes('enhancement')) {
        problem += 'strategic enhancements to optimize current operations and expand capabilities.';
      } else {
        problem += 'optimization and scaling to support business growth.';
      }
    } else if (projectScope && typeof projectScope === 'string') {
      problem += `a ${projectScope.toLowerCase()} solution to address current business needs.`;
    } else {
      problem += 'a strategic solution to address key business challenges and opportunities.';
    }
    
    return problem;
  }

  // Extract measures of success from answers
  function extractMeasuresOfSuccess(answers: Answer[]): string {
    const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
    
    const businessValue = answerMap.get('business-value');
    const userJourney = answerMap.get('user-journey');
    const targetAudience = answerMap.get('target-audience');
    
    const measures: string[] = [];
    
    if (businessValue) {
      const values = Array.isArray(businessValue) ? businessValue : [businessValue];
      if (values.length > 0) {
        const topValues = values.slice(0, 3).map(v => typeof v === 'string' ? v : String(v));
        measures.push(...topValues.map(v => `• ${v}`));
      }
    }
    
    if (userJourney) {
      const journeys = Array.isArray(userJourney) ? userJourney : [userJourney];
      if (journeys.length > 0) {
        const topJourneys = journeys.slice(0, 2).map(j => typeof j === 'string' ? j : String(j));
        measures.push(...topJourneys.map(j => `• Improved user experience through ${j.toLowerCase()}`));
      }
    }
    
    if (targetAudience && typeof targetAudience === 'string') {
      measures.push(`• Increased engagement and conversion among ${targetAudience.toLowerCase()}`);
    }
    
    if (measures.length === 0) {
      return '• Achievement of project objectives\n• Improved business metrics\n• Enhanced user satisfaction\n• Successful project delivery within timeline and budget';
    }
    
    return measures.join('\n');
  }

  // Generate comprehensive mission statement that describes the project plan in total
  // This should read like a mission statement created during the proposal process
  function generateSummaryFromAnswers(projectName: string, _initialSummary: string, answers: Answer[]): string {
    const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
    
    // Gather all strategic inputs (EXCLUDING problem-statement - we synthesize, not repeat)
    const targetAudience = answerMap.get('target-audience');
    const businessValue = answerMap.get('business-value');
    const currentState = answerMap.get('current-state');
    const projectScope = answerMap.get('project-scope');
    const contentStrategy = answerMap.get('content-strategy') || answerMap.get('content-status') || answerMap.get('brand-assets');
    const technicalRequirements = answerMap.get('technical-requirements');
    const timeline = answerMap.get('timeline-urgency') || answerMap.get('timeline-preference');
    
    // Build comprehensive mission statement that describes the project plan in total
    // This reads like a mission statement created during the proposal process
    let summary = '';
    
    // Mission Statement - High-level project vision
    summary += `**Project Mission:** ${projectName} is a strategic initiative designed to `;
    
    // Synthesize primary objectives from business value
    if (businessValue) {
      const values = Array.isArray(businessValue) ? businessValue : [businessValue];
      if (values.length > 0) {
        const primaryGoals = values.slice(0, 2).map(v => typeof v === 'string' ? v.toLowerCase() : String(v).toLowerCase());
        summary += `${primaryGoals.join(' and ')}, `;
      }
    }
    
    // Target audience context
    if (targetAudience && typeof targetAudience === 'string') {
      summary += `specifically targeting ${targetAudience.toLowerCase()}, `;
    }
    
    summary += `positioning the organization for sustained growth and competitive advantage.\n\n`;
    
    // Project Plan Overview - What we're building
    summary += `**Project Plan:** This engagement will `;
    
    const planElements: string[] = [];
    
    if (currentState && typeof currentState === 'string') {
      if (currentState.includes('Starting from scratch')) {
        planElements.push('establish a new digital foundation from the ground up');
      } else if (currentState.includes('overhaul') || currentState.includes('complete overhaul')) {
        planElements.push('execute a comprehensive transformation of existing systems');
      } else if (currentState.includes('enhancement')) {
        planElements.push('strategically enhance and optimize current infrastructure');
      } else {
        planElements.push('scale and optimize existing capabilities');
      }
    }
    
    if (projectScope && typeof projectScope === 'string') {
      const isLogoOrBranding = projectName.toLowerCase().includes('logo') || 
                                projectName.toLowerCase().includes('brand') ||
                                projectScope.toLowerCase().includes('brand') ||
                                projectScope.toLowerCase().includes('logo');
      const isVideo = projectName.toLowerCase().includes('video') || 
                      projectScope.toLowerCase().includes('video');
      
      if (isLogoOrBranding) {
        planElements.push('develop a comprehensive brand identity system');
      } else if (isVideo) {
        planElements.push('create compelling visual content and storytelling');
      } else if (projectScope.includes('Complete') || projectScope.includes('Full')) {
        planElements.push('deliver an end-to-end digital solution');
      } else {
        planElements.push('focus on strategic priorities and key deliverables');
      }
    }
    
    if (planElements.length > 0) {
      summary += planElements.join(' and ') + '. ';
    } else {
      summary += 'deliver a strategic solution aligned with business objectives. ';
    }
    
    // Implementation approach
    const implementationDetails: string[] = [];
    
    if (contentStrategy && typeof contentStrategy === 'string') {
      if (contentStrategy.includes('Need content') || contentStrategy.includes('Starting from scratch')) {
        implementationDetails.push('comprehensive content strategy development');
      } else if (contentStrategy.includes('Some content')) {
        implementationDetails.push('strategic content refinement');
      }
    }
    
    if (technicalRequirements && !projectName.toLowerCase().includes('logo') && !projectName.toLowerCase().includes('brand')) {
      const techReqs = Array.isArray(technicalRequirements) ? technicalRequirements : [technicalRequirements];
      if (techReqs.length > 0 && !techReqs.includes('None - standalone project')) {
        const techCount = techReqs.filter(r => r !== 'None - standalone project').length;
        implementationDetails.push(`${techCount} key technical integration${techCount > 1 ? 's' : ''}`);
      }
    }
    
    if (implementationDetails.length > 0) {
      summary += `The approach includes ${implementationDetails.join(' and ')} to ensure a robust, scalable solution. `;
    }
    
    // Timeline and scope context
    if (timeline && typeof timeline === 'string') {
      if (timeline.includes('Time-sensitive') || timeline.includes('Rush')) {
        summary += `The project will be executed on an accelerated timeline to meet critical business needs. `;
      } else if (timeline.includes('Strategic') || timeline.includes('3-6 months')) {
        summary += `This strategic engagement allows for thorough planning and execution. `;
      }
    }
    
    // Closing statement
    summary += `Every phase—from discovery and planning through design, development, and launch—is structured to deliver measurable outcomes that drive business value and position ${projectName} for long-term success.`;

    return summary;
  }

  // Task descriptions mapping
  const taskDescriptions: Record<string, string> = {
    'discovery': 'Initial project discovery phase including stakeholder interviews, requirements gathering, and strategic planning to define project scope and objectives.',
    'research': 'Market research, competitive analysis, user research, and data collection to inform design and development decisions.',
    'branding': 'Complete brand identity development including logo design, color palette, typography, brand guidelines, and visual identity system.',
    'ui-design': 'User interface and user experience design including wireframes, mockups, prototypes, and design system creation for optimal user interactions.',
    'content': 'Content creation and strategy including copywriting, image sourcing, content organization, and content management system setup.',
    'development': 'Frontend and backend development including coding, implementation, API integration, and technical infrastructure setup.',
    'testing': 'Quality assurance and testing including functionality testing, cross-browser testing, performance optimization, and bug fixes.',
    'revisions': 'Client feedback incorporation, design revisions, content updates, and iterative refinements based on review cycles.',
    'launch': 'Final deployment, site launch, documentation handoff, training, and post-launch support and monitoring.',
  };

  // Initialize task order when tasks change
  useEffect(() => {
    if (localTasks.length > 0) {
      const selectedTasks = localTasks.filter(t => selectedTaskIds.has(t.id));
      const selectedTaskIdsSet = new Set(selectedTasks.map(t => t.id));
      const currentOrder = selectedTasks
        .sort((a, b) => b.baseHours * b.multiplier - a.baseHours * a.multiplier)
        .map(t => t.id);
      
      // Only update if order is empty, length changed, or has new/removed tasks
      const orderTaskIds = new Set(taskOrder);
      const hasNewTasks = currentOrder.some(id => !orderTaskIds.has(id));
      const hasRemovedTasks = taskOrder.some(id => !selectedTaskIdsSet.has(id));
      
      if (taskOrder.length === 0 || 
          currentOrder.length !== taskOrder.length ||
          hasNewTasks ||
          hasRemovedTasks) {
        setTaskOrder(currentOrder);
      }
    }
  }, [localTasks, selectedTaskIds]);

  const chartData = useMemo(() => {
    if (!tasksWithSelection || tasksWithSelection.length === 0) {
      return [];
    }
    const selectedTasks = tasksWithSelection.filter(t => t.selected !== false);
    const data = selectedTasks.map((task) => ({
      name: task.name,
      hours: Math.round(task.baseHours * task.multiplier),
      category: task.category,
      multiplier: task.multiplier,
      taskId: task.id,
      selected: task.selected,
      description: taskDescriptions[task.id] || `${task.name} work including planning, execution, and delivery.`,
    }));
    
    // Sort by custom order if available, otherwise by hours
    if (taskOrder.length > 0) {
      return data.sort((a, b) => {
        const aIndex = taskOrder.indexOf(a.taskId);
        const bIndex = taskOrder.indexOf(b.taskId);
        if (aIndex === -1 && bIndex === -1) return b.hours - a.hours;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    return data.sort((a, b) => b.hours - a.hours);
  }, [tasksWithSelection, taskOrder]);
  
  // Handle drag and drop reordering
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    
    const currentOrder = [...taskOrder];
    const draggedIndex = currentOrder.indexOf(draggedTaskId);
    
    if (draggedIndex === -1) return;
    
    // Remove from old position
    currentOrder.splice(draggedIndex, 1);
    // Insert at new position
    const newIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    currentOrder.splice(newIndex, 0, draggedTaskId);
    
    setTaskOrder(currentOrder);
    setDraggedTaskId(null);
    setDragOverIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverIndex(null);
  };

  // Handle sending email with PDF attachment
  const handleSendEmail = async () => {
    if (!senderName || !senderEmail) {
      setShowSenderModal(true);
      return;
    }

    setIsSendingEmail(true);
    
    try {
      const pdfData = {
        projectName,
        projectSummary: editableSummary,
        problemStatement: problemStatement,
        measureOfSuccess: measureOfSuccess,
        estimate: {
          tasks: tasksWithSelection.filter(t => t.selected !== false),
          totalHours: selectedTotalHours,
          timeline: calculatedTimeline,
        },
        tasks: tasksWithSelection.filter(t => t.selected !== false),
        timeline: calculatedTimeline,
        answers: answers,
      };

      // Generate PDF as blob
      const pdfBlob = exportToSOWPDF(pdfData, true) as Blob;
      const fileName = `SOW-${projectName.replace(/\s+/g, '-')}-${new Date()
        .toISOString()
        .split('T')[0]}.pdf`;

      // Convert blob to base64 for EmailJS
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      
      reader.onloadend = async () => {
        const base64PDF = reader.result as string;
        const base64Data = base64PDF.split(',')[1]; // Remove data:application/pdf;base64, prefix

        // Check if EmailJS is configured
        if (EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' || 
            EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
            EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
          alert('EmailJS is not configured. Please set up EmailJS credentials in src/config/emailjs.ts\n\nFor now, the PDF has been downloaded. Please attach it manually to your email.');
          exportToSOWPDF(pdfData); // Download PDF as fallback
          setIsSendingEmail(false);
          return;
        }

        // Initialize EmailJS
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

        // Prepare email template parameters
        const templateParams = {
          to_email: 'michael@santacruzstudios.com',
          from_name: senderName,
          from_email: senderEmail,
          subject: `Statement of Work - ${projectName}`,
          message: `Dear Michael,\n\nPlease find attached the Statement of Work for ${projectName}.\n\nProject Summary: ${editableSummary || 'N/A'}\nTotal Hours: ${selectedTotalHours}\nTimeline: ${calculatedTimeline.weeks} weeks\n\nPlease review and let me know if you have any questions.\n\nBest regards,\n${senderName}`,
          attachment: base64Data,
          attachment_name: fileName,
        };

        // Send email via EmailJS
        await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, templateParams);
        
        alert('Email sent successfully to michael@santacruzstudios.com!');
        setIsSendingEmail(false);
      };

      reader.onerror = () => {
        alert('Error generating PDF. Please try again.');
        setIsSendingEmail(false);
      };

    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Please check your EmailJS configuration or try downloading the PDF and sending it manually.');
      setIsSendingEmail(false);
    }
  };

  // Listen for top-level "Export" requests from the ProposalBuilder header
  useEffect(() => {
    const handleExternalExport = () => {
      const pdfData = {
        projectName,
        projectSummary: editableSummary,
        problemStatement: problemStatement,
        measureOfSuccess: measureOfSuccess,
        estimate: {
          tasks: tasksWithSelection.filter(t => t.selected !== false),
          totalHours: selectedTotalHours,
          timeline: calculatedTimeline,
        },
        tasks: tasksWithSelection.filter(t => t.selected !== false),
        timeline: calculatedTimeline,
        answers: answers,
      };
      exportToSOWPDF(pdfData);
    };

    window.addEventListener('proposalbuilder:export-sow', handleExternalExport);
    return () => {
      window.removeEventListener('proposalbuilder:export-sow', handleExternalExport);
    };
  }, [projectName, editableSummary, problemStatement, measureOfSuccess, tasksWithSelection, selectedTotalHours, calculatedTimeline, answers]);

  const handleBarClick = (taskId: string) => {
    const element = document.getElementById(`task-card-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the card briefly
      element.classList.add('ring-4', 'ring-portfolio-blue', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-portfolio-blue', 'ring-offset-2');
      }, 2000);
    }
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate next business Monday (one week from today, then find next Monday)
  const getNextBusinessMonday = (): Date => {
    const today = new Date();
    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(today.getDate() + 7);
    
    // Find the next Monday (if it's already Monday, use that; otherwise find next Monday)
    const dayOfWeek = oneWeekFromToday.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Calculate days until next Monday: (8 - dayOfWeek) % 7
    // Sunday (0) -> 1 day, Monday (1) -> 0 days, Tuesday (2) -> 6 days, etc.
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    
    const nextMonday = new Date(oneWeekFromToday);
    nextMonday.setDate(oneWeekFromToday.getDate() + daysUntilMonday);
    
    return nextMonday;
  };

  const startDate = getNextBusinessMonday();

  // Safety check - if no tasks, show message
  if (!tasks || tasks.length === 0) {
    return (
      <div className="portfolio-card p-8 md:p-10">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Tasks Available</h2>
          <p className="text-gray-600">Please go back and complete the questions to generate an estimate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl mx-auto">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFD700] via-blue-400 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/20 overflow-hidden w-full">
          
          {/* ============================================ */}
          {/* SECTION 1: Header, Total Cost, Timeline Metrics, and Summary Sections */}
          {/* ============================================ */}
          <div 
            className="transition-all duration-500 ease-in-out overflow-hidden"
            style={{
              maxHeight: isSection1Open ? '5000px' : '50px',
              opacity: isSection1Open ? 1 : 1,
            }}
          >
          {isSection1Open ? (
            <div
              onMouseLeave={(e) => {
                // Check if mouse is moving below Section 1 (towards Section 2)
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseY = e.clientY;
                // If mouse is below the section, open Section 2
                if (mouseY > rect.bottom) {
                  setIsSection2Open(true);
                  setIsSection1Open(false);
                  setIsSection3Open(false);
                }
              }}
            >
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Project Estimate</h2>
                <p className="text-sm text-gray-500">Customize your estimate in real-time</p>
              </div>

              {/* Total Project Cost */}
              <div 
                className="mb-6 rounded-xl p-5 shadow-sm border border-portfolio-blue/20 relative overflow-hidden" 
                style={{
                  backgroundImage: `url('${import.meta.env.BASE_URL}assets/banner.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center center',
                  backgroundRepeat: 'no-repeat',
                  minHeight: '150px'
                }}
              >
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
                <div className="relative z-10">
                  <div>
                    <p className="text-sm font-semibold text-white/90 mb-1">Total Project Cost</p>
                    <p className="text-2xl font-bold text-white mb-2">
                      ${(selectedTotalHours * 125).toLocaleString()}
                    </p>
                    <p className="text-base font-semibold text-white">{Math.round(selectedTotalHours)}h</p>
                    <p className="text-sm text-white/80">@ $125/hr</p>
                  </div>
                </div>
              </div>

              {/* Project Timeline Header - Clean Metrics */}
              <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center mb-1.5">
                      <Calendar className="w-4 h-4 text-portfolio-blue mr-1.5" />
                      <span className="text-xs font-medium text-gray-600">Start Date</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center mb-1.5">
                      <Calendar className="w-4 h-4 text-portfolio-blue mr-1.5" />
                      <span className="text-xs font-medium text-gray-600">Timeline</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {calculatedTimeline.weeks} {calculatedTimeline.weeks === 1 ? 'wk' : 'wks'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center mb-1.5">
                      <Calendar className="w-4 h-4 text-portfolio-blue mr-1.5" />
                      <span className="text-xs font-medium text-gray-600">Hours</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{Math.round(selectedTotalHours)}</p>
                  </div>
                  <div>
                    <div className="flex items-center mb-1.5">
                      <Calendar className="w-4 h-4 text-portfolio-blue mr-1.5" />
                      <span className="text-xs font-medium text-gray-600">Completion</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDate(calculatedTimeline.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Summary, Problem Statement, Measure of Success */}
              <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Executive Summary Column */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold text-gray-900">Executive Summary</h3>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              Editable
            </span>
          </div>
          <textarea
            value={editableSummary}
            onChange={(e) => setEditableSummary(e.target.value)}
            placeholder="A comprehensive mission statement describing the project plan..."
            className="w-full px-2.5 py-1.5 text-xs border-0 rounded-lg focus:ring-2 focus:ring-portfolio-blue resize-y bg-gray-50 text-gray-800 leading-relaxed flex-1 min-h-[80px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Included in Statement of Work
          </p>
        </div>

        {/* Problem Statement Column */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold text-gray-900">Problem Statement</h3>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              Editable
            </span>
          </div>
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Describe the business challenge or opportunity this project addresses..."
            className="w-full px-2.5 py-1.5 text-xs border-0 rounded-lg focus:ring-2 focus:ring-portfolio-blue resize-y bg-gray-50 text-gray-800 leading-relaxed flex-1 min-h-[80px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Included in Statement of Work
          </p>
        </div>

        {/* Measure of Success Column */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-bold text-gray-900">Measure of Success</h3>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              Editable
            </span>
          </div>
          <textarea
            value={measureOfSuccess}
            onChange={(e) => setMeasureOfSuccess(e.target.value)}
            placeholder="Define how project success will be measured..."
            className="w-full px-2.5 py-1.5 text-xs border-0 rounded-lg focus:ring-2 focus:ring-portfolio-blue resize-y bg-gray-50 text-gray-800 leading-relaxed font-mono whitespace-pre-line flex-1 min-h-[80px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Included in Statement of Work
          </p>
        </div>
              </div>
            </div>
          ) : (
            /* Collapsed Section 1 - Show only Total Cost */
            <div 
              className="mb-8 rounded-xl shadow-sm border border-portfolio-blue/20 relative overflow-hidden cursor-pointer transition-all duration-500 ease-in-out hover:shadow-md flex items-center"
              style={{
                backgroundImage: `url('${import.meta.env.BASE_URL}assets/banner.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                minHeight: '50px',
                paddingLeft: '20px',
                paddingRight: '20px',
                opacity: isSection1Open ? 0 : 1,
                transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
              }}
              onMouseEnter={() => {
                setIsSection1Open(true);
                // Close both Section 2 and Section 3 - only one section (1-3) can be open at a time
                setIsSection2Open(false);
                setIsSection3Open(false);
              }}
            >
              <div className="absolute inset-0 bg-black/20 rounded-xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/90 mb-1">Total Project Cost</p>
                  <p className="text-xl font-bold text-white">
                    ${(selectedTotalHours * 125).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{Math.round(selectedTotalHours)}h</p>
                  <p className="text-xs text-white/80">@ $125/hr</p>
                </div>
              </div>
            </div>
          )}
          </div>
          {/* End Section 1 */}

      {/* ============================================ */}
      {/* SECTION 2: Resource Allocation (Adjust Task Hours + Task Hours Breakdown) */}
      {/* ============================================ */}
      <div 
        className="mb-8"
        onMouseEnter={() => {
          setIsSection2Open(true);
          // Close both Section 1 and Section 3 - only one section (1-3) can be open at a time
          setIsSection1Open(false);
          setIsSection3Open(false);
        }}
        onMouseLeave={() => {
          setIsSection2Open(false);
          // When Section 2 closes, open Section 1 to ensure at least one section is open
          setIsSection1Open(true);
        }}
      >
        <div 
          className="transition-all duration-500 ease-in-out overflow-hidden"
          style={{
            maxHeight: isSection2Open ? '5000px' : '50px',
            opacity: isSection2Open ? 1 : 1,
          }}
        >
        {isSection2Open ? (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Resource Allocation</h3>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-portfolio-blue text-white rounded-lg text-sm font-medium hover:bg-portfolio-blue-dark transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

          {/* Combined Layout: Adjustments on Left, Chart on Right */}
          <div className="flex gap-6 items-start">
            {/* Left: Adjust Task Hours */}
            <div className="w-64 flex-shrink-0">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-left">Adjust Task Hours</h4>
              <div style={{ paddingTop: '5px' }}>
                {chartData.filter((d) => d.selected).map((entry, index) => {
                  const task = tasksWithSelection.find(t => t.id === entry.taskId);
                  if (!task) return null;
                  
                  const isEditing = editingTaskId === entry.taskId;
                  const showDropdown = openDropdownId === entry.taskId;
                  const isDragging = draggedTaskId === entry.taskId;
                  const isDragOver = dragOverIndex === index;
                  
                  // Expanded row height for better readability (70px per row)
                  const rowHeight = 70;
                  
                  return (
                    <div 
                      id={`task-card-${entry.taskId}`}
                      key={entry.taskId}
                      draggable
                      onDragStart={() => handleDragStart(entry.taskId)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-gray-50 rounded-lg p-2 shadow-sm hover:shadow transition-all relative border ${
                        isDragging ? 'opacity-50 border-portfolio-blue' : 
                        isDragOver ? 'border-portfolio-blue border-2' : 
                        'border-gray-100'
                      } cursor-move`}
                      style={{ 
                        height: `${rowHeight}px`,
                        marginTop: '0',
                        marginBottom: '0'
                      }}
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            value={editTaskHours}
                            onChange={(e) => setEditTaskHours(parseFloat(e.target.value) || 0)}
                            className="w-full px-1.5 py-0.5 border-2 border-portfolio-blue rounded text-xs font-semibold focus:ring-2 focus:ring-portfolio-blue mb-1.5"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(entry.taskId);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(entry.taskId)}
                              className="flex-1 px-2 py-1 bg-portfolio-blue text-white rounded text-xs font-medium hover:bg-portfolio-blue-dark transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-1 mb-1">
                            <GripVertical className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-gray-900 text-xs truncate">{entry.name}</h5>
                              <p className="text-[10px] text-gray-600">{entry.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const newHours = Math.max(1, entry.hours - 5);
                                  handleTaskHoursChange(entry.taskId, newHours);
                                }}
                                className="px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-medium transition-colors"
                                title="Reduce by 5 hours"
                              >
                                −5
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={entry.hours}
                                onChange={(e) => {
                                  const newHours = parseFloat(e.target.value);
                                  if (!isNaN(newHours) && newHours > 0) {
                                    handleTaskHoursChange(entry.taskId, newHours);
                                  }
                                }}
                                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center font-semibold text-xs focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                              />
                              <button
                                onClick={() => {
                                  const newHours = entry.hours + 5;
                                  handleTaskHoursChange(entry.taskId, newHours);
                                }}
                                className="px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-medium transition-colors"
                                title="Add 5 hours"
                              >
                                +5
                              </button>
                            </div>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(showDropdown ? null : entry.taskId);
                                }}
                                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                title="Task options"
                              >
                                <MoreVertical className="w-3 h-3 text-gray-600" />
                              </button>
                              
                              {showDropdown && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setOpenDropdownId(null)}
                                  />
                                  <div className="absolute right-0 top-6 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-[160px] py-1">
                                    <button
                                      onClick={() => handleStartEdit(entry.taskId, entry.hours)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Edit Hours
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${entry.name}"?`)) {
                                          handleDeleteTask(entry.taskId);
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete Task
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Task Hours Breakdown Chart - Extended to match rows exactly */}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-left">Task Hours Breakdown</h4>
              <ResponsiveContainer 
                width="100%" 
                height={chartData.filter((d) => d.selected).length * 70 + 35}
              >
                <BarChart
                  data={chartData.filter((d) => d.selected)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickMargin={5}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content={(props: any) => {
                      if (props?.active && props?.payload && props.payload.length > 0) {
                        const payloadItem = props.payload[0];
                        const data = payloadItem.payload as { name: string; hours: number; description?: string };
                        const hourlyRate = 125; // Blended rate from SCS SOW
                        const cost = data.hours * hourlyRate;
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-200 max-w-xs">
                            <div className="font-bold text-gray-900 mb-2">{data.name}</div>
                            {data.description && <div className="text-sm text-gray-600 mb-3">{data.description}</div>}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500">Estimated Hours:</span>
                              <span className="font-bold text-portfolio-blue">{data.hours}h</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-gray-500">Estimated Cost:</span>
                              <span className="font-bold text-portfolio-blue">${cost.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-2 italic">Click to adjust hours on the left</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    radius={[0, 8, 8, 0]}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.filter((d) => d.selected).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        onClick={() => handleBarClick(entry.taskId)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        ) : (
          /* Collapsed Section 2 - Show horizontal summary row */
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-500 ease-in-out hover:shadow-md flex items-center"
            style={{
              minHeight: '50px',
              paddingLeft: '20px',
              paddingRight: '20px',
              opacity: isSection2Open ? 0 : 1,
              transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold text-gray-900">Resource Allocation</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Total Tasks: </span>
                    <span className="font-semibold text-gray-900">{chartData.filter((d) => d.selected).length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Hours: </span>
                    <span className="font-semibold text-portfolio-blue">{Math.round(selectedTotalHours)}h</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Est. Cost: </span>
                    <span className="font-semibold text-portfolio-blue">${(selectedTotalHours * 125).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">Hover to expand</div>
            </div>
          </div>
        )}
        </div>
      </div>
      {/* End Section 2 */}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Task</h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g., Custom Feature Development"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  placeholder="e.g., Custom, Development, Design"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hours
                </label>
                <input
                  type="number"
                  min={1}
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(parseFloat(e.target.value) || 1)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim() || newTaskHours <= 0}
                  className="flex-1 px-6 py-3 bg-portfolio-blue text-white rounded-lg font-semibold hover:bg-portfolio-blue-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 3: Project Milestones and Timeline & Calendar */}
      {/* ============================================ */}
      <div 
        className="mb-8"
        onMouseEnter={() => {
          setIsSection3Open(true);
          // Close both Section 1 and Section 2 - only one section (1-3) can be open at a time
          setIsSection1Open(false);
          setIsSection2Open(false);
        }}
        onMouseLeave={() => {
          setIsSection3Open(false);
          // When Section 3 closes, open Section 1 to ensure at least one section is open
          setIsSection1Open(true);
        }}
      >
        <div 
          className="transition-all duration-500 ease-in-out overflow-hidden"
          style={{
            maxHeight: isSection3Open ? '5000px' : '50px',
            opacity: isSection3Open ? 1 : 1,
          }}
        >
        {isSection3Open ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones Breakdown - Left Column */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-900">Project Milestones</h3>
            <p className="text-xs text-gray-500">Select tasks to include</p>
          </div>
          
          <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {milestoneData.map((milestone) => {
              const selectedCount = milestone.tasks.filter((t) => t.selected).length;
              const totalCount = milestone.tasks.length;
              const hourlyRate = 125;
              const milestoneCost = Math.round(milestone.selectedHours) * hourlyRate;
              
              return (
                <div key={milestone.category} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs text-gray-900">{milestone.category}</h4>
                      <span className="text-[10px] text-gray-500 bg-white px-1 py-0.5 rounded">
                        {selectedCount}/{totalCount}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-portfolio-blue leading-tight">
                        {Math.round(milestone.selectedHours)}h
                      </p>
                      <p className="text-xs font-semibold text-gray-900 leading-tight">
                        ${milestoneCost.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        {milestone.selectedPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Horizontal percentage bar */}
                  <div className="relative h-4 bg-gray-200 rounded overflow-hidden mb-1.5">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-portfolio-blue to-portfolio-blue-dark rounded transition-all duration-300"
                      style={{ width: `${milestone.selectedPercentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-900 z-10">
                        {milestone.selectedPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Task checkboxes */}
                  <div className="grid grid-cols-2 gap-1">
                    {milestone.tasks.map((task) => {
                      const taskHours = Math.round(task.baseHours * task.multiplier);
                      return (
                        <label
                          key={task.id}
                          className={`flex items-center gap-1 p-1 rounded cursor-pointer transition-all ${
                            task.selected
                              ? 'bg-blue-50 border border-portfolio-blue'
                              : 'bg-white border border-gray-200 hover:border-portfolio-blue'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={task.selected}
                            onChange={() => handleTaskToggle(task.id)}
                            className="sr-only"
                          />
                          {task.selected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-portfolio-blue flex-shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-gray-900 truncate leading-tight">{task.name}</p>
                            <p className="text-[10px] text-gray-500 leading-tight">{taskHours}h</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Calendar - Right Column */}
        <div className="h-full">
          <TimelineCalendar
            tasks={tasksWithSelection.filter(t => t.selected !== false)}
            timeline={calculatedTimeline}
            projectName={projectName}
          />
        </div>
          </div>
        ) : (
          /* Collapsed Section 3 - Show horizontal summary row */
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-500 ease-in-out hover:shadow-md flex items-center"
            style={{
              minHeight: '50px',
              paddingLeft: '20px',
              paddingRight: '20px',
              opacity: isSection3Open ? 0 : 1,
              transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold text-gray-900">Project Milestones & Timeline</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Milestones: </span>
                    <span className="font-semibold text-gray-900">{milestoneData.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Timeline: </span>
                    <span className="font-semibold text-portfolio-blue">{calculatedTimeline.weeks} {calculatedTimeline.weeks === 1 ? 'wk' : 'wks'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Start: </span>
                    <span className="font-semibold text-gray-900">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End: </span>
                    <span className="font-semibold text-gray-900">{formatDate(calculatedTimeline.endDate)}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400">Hover to expand</div>
            </div>
          </div>
        )}
        </div>
      </div>
      {/* End Section 3 */}

      {/* ============================================ */}
      {/* SECTION 4: Statement of Work, Download, and Send Preview */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FFD700] rounded-full flex items-center justify-center">
              <FileText className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Statement of Work</h3>
              <p className="text-[11px] text-gray-500 leading-tight">Export as professional SOW ready to email</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
                exportToSOWPDF({
                  projectName,
                  projectSummary: editableSummary,
                  problemStatement: problemStatement,
                  measureOfSuccess: measureOfSuccess,
                  estimate: {
                    tasks: tasksWithSelection.filter(t => t.selected !== false),
                    totalHours: selectedTotalHours,
                    timeline: calculatedTimeline,
                  },
                  tasks: tasksWithSelection.filter(t => t.selected !== false),
                  timeline: calculatedTimeline,
                  answers: answers,
                });
            }}
            className="flex items-center gap-2 px-3 py-2 bg-[#FFD700] text-black rounded-lg font-semibold text-xs hover:bg-[#FFC700] transition-all"
          >
            <Download className="w-4 h-4" />
            Download SOW PDF
          </button>
          
          <button
            onClick={() => {
              // Show modal to collect sender info if not already set
              if (!senderName || !senderEmail) {
                setShowSenderModal(true);
              } else {
                handleSendEmail();
              }
            }}
            disabled={isSendingEmail}
            className="flex items-center gap-2 px-3 py-2 bg-portfolio-blue text-white rounded-lg font-semibold text-xs hover:bg-portfolio-blue-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {isSendingEmail ? 'Sending...' : 'Send for Review'}
          </button>
        </div>
        
        <div className="mt-3 p-3 bg-white/50 rounded-lg border border-yellow-200">
          <p className="text-xs text-gray-700">
            <strong>Ready to send to:</strong> michael@santacruzstudios.com
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            The PDF includes all project details, timeline, milestones, and terms ready for review and approval.
          </p>
        </div>
      </div>
      {/* End Section 4 */}
          </div>
          {/* Close main content div */}
      
      {/* Sender Info Modal */}
      {showSenderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Sender Information</h3>
              <button
                onClick={() => setShowSenderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSenderModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (senderName.trim() && senderEmail.trim()) {
                    setShowSenderModal(false);
                    handleSendEmail();
                  } else {
                    alert('Please enter both your name and email address.');
                  }
                }}
                disabled={!senderName.trim() || !senderEmail.trim()}
                className="flex-1 px-4 py-2 bg-portfolio-blue text-white rounded-lg font-semibold hover:bg-portfolio-blue-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
