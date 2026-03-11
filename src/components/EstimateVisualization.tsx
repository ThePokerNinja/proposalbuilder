import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Task } from '../types';
import { Calendar, Clock, CheckCircle2, Circle, Download, FileText, Plus, X, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { TimelineCalendar } from './TimelineCalendar';
import { exportToSOWPDF } from '../utils/exportToPDF';

// 3D Visualization - uncomment when @react-three/fiber is installed
// import { Sphere3DVisualization } from './Sphere3DVisualization';

interface EstimateVisualizationProps {
  tasks: Task[];
  totalHours: number;
  timeline: { weeks: number; startDate: Date; endDate: Date };
  onTaskMultiplierChange: (taskId: string, multiplier: number) => void;
  onTasksChange?: (updatedTasks: Task[]) => void;
  projectName?: string;
  projectSummary?: string;
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444'];

export function EstimateVisualization({
  tasks,
  totalHours,
  timeline,
  onTaskMultiplierChange,
  onTasksChange,
  projectName = 'Project',
  projectSummary = '',
}: EstimateVisualizationProps) {
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
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

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

  const handleQuickAdjustHours = (taskId: string, delta: number) => {
    const task = localTasks.find(t => t.id === taskId);
    if (task) {
      const currentHours = Math.round(task.baseHours * task.multiplier);
      const newHours = Math.max(1, currentHours + delta);
      handleTaskHoursChange(taskId, newHours);
    }
  };

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

  const chartData = useMemo(() => {
    if (!tasksWithSelection || tasksWithSelection.length === 0) {
      return [];
    }
    return tasksWithSelection
      .map((task) => ({
        name: task.name,
        hours: Math.round(task.baseHours * task.multiplier),
        category: task.category,
        multiplier: task.multiplier,
        taskId: task.id,
        selected: task.selected,
        description: taskDescriptions[task.id] || `${task.name} work including planning, execution, and delivery.`,
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [tasksWithSelection]);

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
    <div className="portfolio-card p-8 md:p-10">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">Your Project Estimate</h2>
        <p className="text-lg text-gray-600 font-light">Adjust the sliders to customize your estimate in real-time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-100 shadow-md">
          <div className="flex items-center mb-3">
            <Clock className="w-6 h-6 text-portfolio-blue mr-2" />
            <span className="text-sm font-semibold text-portfolio-blue">Selected Hours</span>
          </div>
          <p className="text-4xl font-bold text-gray-900">{Math.round(selectedTotalHours)}</p>
          {selectedTotalHours !== totalHours && (
            <p className="text-xs text-gray-600 mt-2 font-medium">
              of {Math.round(totalHours)} total
            </p>
          )}
        </div>
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-100 shadow-md">
          <div className="flex items-center mb-3">
            <Calendar className="w-6 h-6 text-portfolio-blue mr-2" />
            <span className="text-sm font-semibold text-portfolio-blue">Timeline</span>
          </div>
          <p className="text-4xl font-bold text-gray-900">{timeline.weeks} weeks</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-100 shadow-md">
          <div className="flex items-center mb-3">
            <Calendar className="w-6 h-6 text-portfolio-blue mr-2" />
            <span className="text-sm font-semibold text-portfolio-blue">Completion</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDate(timeline.endDate)}</p>
        </div>
      </div>

      {/* Row 1: Resource Allocation - Full Width with Multiple Visualizations */}
      <div className="mb-8">
        <div className="bg-gray-50 rounded-xl p-8 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Resource Allocation</h3>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-portfolio-blue text-white rounded-lg font-semibold hover:bg-portfolio-blue-dark transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>
          
          {/* Task Hours Breakdown - Full Width */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-left">Task Hours Breakdown</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={chartData.filter((d) => d.selected)} 
                layout="vertical" 
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
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
                  width={140}
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-gray-200 max-w-xs">
                          <div className="font-bold text-gray-900 mb-2">{data.name}</div>
                          <div className="text-sm text-gray-600 mb-3">{data.description}</div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-500">Estimated Hours:</span>
                            <span className="font-bold text-portfolio-blue">{data.hours}h</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2 italic">Click to adjust hours below</div>
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

          {/* Editable Task List with Hours Reduction */}
          <div className="mt-8 border-t border-gray-300 pt-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-left">Adjust Task Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chartData.filter((d) => d.selected).map((entry) => {
                const task = tasksWithSelection.find(t => t.id === entry.taskId);
                if (!task) return null;
                
                const isHovered = hoveredTaskId === entry.taskId;
                const isEditing = editingTaskId === entry.taskId;
                const showDropdown = openDropdownId === entry.taskId;
                
                return (
                  <div 
                    id={`task-card-${entry.taskId}`}
                    key={entry.taskId}
                    className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all relative scroll-mt-20"
                    onMouseEnter={() => setHoveredTaskId(entry.taskId)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editTaskHours}
                            onChange={(e) => setEditTaskHours(parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border-2 border-portfolio-blue rounded text-sm font-semibold focus:ring-2 focus:ring-portfolio-blue"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(entry.taskId);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                        ) : (
                          <>
                            <h5 className="font-semibold text-gray-900 text-sm mb-1 truncate">{entry.name}</h5>
                            <p className="text-xs text-gray-600">{entry.category}</p>
                          </>
                        )}
                      </div>
                      
                      {/* Dropdown Menu */}
                      <div className="relative ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(showDropdown ? null : entry.taskId);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Task options"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {showDropdown && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-[160px] py-1">
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
                    
                    {isEditing ? (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveEdit(entry.taskId)}
                          className="flex-1 px-3 py-1.5 bg-portfolio-blue text-white rounded text-sm font-medium hover:bg-portfolio-blue-dark transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Hover Slider - Shows on hover */}
                        {isHovered && (
                          <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={() => handleQuickAdjustHours(entry.taskId, -10)}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                                title="Reduce by 10 hours"
                              >
                                −10
                              </button>
                              <button
                                onClick={() => handleQuickAdjustHours(entry.taskId, -5)}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                                title="Reduce by 5 hours"
                              >
                                −5
                              </button>
                              <span className="flex-1 text-center font-bold text-portfolio-blue text-sm">
                                {entry.hours}h
                              </span>
                              <button
                                onClick={() => handleQuickAdjustHours(entry.taskId, 5)}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                                title="Add 5 hours"
                              >
                                +5
                              </button>
                              <button
                                onClick={() => handleQuickAdjustHours(entry.taskId, 10)}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                                title="Add 10 hours"
                              >
                                +10
                              </button>
                            </div>
                            <input
                              type="range"
                              min={Math.max(1, task.baseHours * 0.5)}
                              max={task.baseHours * 2.5}
                              step={1}
                              value={entry.hours}
                              onChange={(e) => handleTaskHoursChange(entry.taskId, parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-portfolio-blue"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>{Math.round(task.baseHours * 0.5)}h</span>
                              <span className="text-gray-400">Base: {task.baseHours}h</span>
                              <span>{Math.round(task.baseHours * 2.5)}h</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Regular Controls - Always visible */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newHours = Math.max(1, entry.hours - 5);
                              handleTaskHoursChange(entry.taskId, newHours);
                            }}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
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
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-center font-semibold text-sm focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                          />
                          <button
                            onClick={() => {
                              const newHours = entry.hours + 5;
                              handleTaskHoursChange(entry.taskId, newHours);
                            }}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
                            title="Add 5 hours"
                          >
                            +5
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          Base: {task.baseHours}h
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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

      {/* Row 2: Milestones Breakdown - Full Width */}
      <div className="mb-8">
        <div className="bg-gray-50 rounded-xl p-8 shadow-md border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Project Milestones Breakdown</h3>
          <p className="text-base text-gray-600 mb-6 font-medium">Select tasks to include in your estimate</p>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {milestoneData.map((milestone) => {
              const selectedCount = milestone.tasks.filter((t) => t.selected).length;
              const totalCount = milestone.tasks.length;
              
              return (
                <div key={milestone.category} className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-gray-900">{milestone.category}</h4>
                      <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
                        ({selectedCount}/{totalCount})
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-portfolio-blue">
                        {Math.round(milestone.selectedHours)}h
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        {milestone.selectedPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Horizontal percentage bar */}
                  <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-portfolio-blue to-portfolio-blue-dark rounded-lg transition-all duration-300"
                      style={{ width: `${milestone.selectedPercentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900 z-10">
                        {milestone.selectedPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Task checkboxes */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {milestone.tasks.map((task) => {
                      const taskHours = Math.round(task.baseHours * task.multiplier);
                      return (
                        <label
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            task.selected
                              ? 'bg-blue-50 border-2 border-portfolio-blue shadow-sm'
                              : 'bg-gray-50 border-2 border-gray-200 hover:border-portfolio-blue'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={task.selected}
                            onChange={() => handleTaskToggle(task.id)}
                            className="sr-only"
                          />
                          {task.selected ? (
                            <CheckCircle2 className="w-5 h-5 text-portfolio-blue flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{task.name}</p>
                            <p className="text-xs text-gray-600 font-medium">{taskHours}h</p>
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
      </div>


      {/* Row 3: Timeline Calendar - Full Width */}
      <div className="mb-8">
        <TimelineCalendar
          tasks={tasksWithSelection.filter(t => t.selected !== false)}
          timeline={timeline}
          projectName={projectName}
        />
      </div>

      {/* Row 4: Statement of Work - Full Width */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-8 shadow-md border-2 border-yellow-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Statement of Work</h3>
              <p className="text-gray-700">Export your estimate as a professional SOW ready to email</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              exportToSOWPDF({
                projectName,
                projectSummary,
                estimate: {
                  tasks: tasksWithSelection.filter(t => t.selected !== false),
                  totalHours: selectedTotalHours,
                  timeline,
                },
                tasks: tasksWithSelection.filter(t => t.selected !== false),
                timeline,
              });
            }}
            className="flex items-center gap-3 px-6 py-4 bg-[#FFD700] text-black rounded-lg font-semibold text-lg hover:bg-[#FFC700] transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Download SOW PDF
          </button>
          
          <button
            onClick={() => {
              // Generate PDF and create mailto link
              const pdfData = {
                projectName,
                projectSummary,
                estimate: {
                  tasks: tasksWithSelection.filter(t => t.selected !== false),
                  totalHours: selectedTotalHours,
                  timeline,
                },
                tasks: tasksWithSelection.filter(t => t.selected !== false),
                timeline,
              };
              
              // Create mailto link
              const subject = encodeURIComponent(`Statement of Work - ${projectName}`);
              const body = encodeURIComponent(
                `Dear Michael,\n\nPlease find attached the Statement of Work for ${projectName}.\n\nProject Summary: ${projectSummary || 'N/A'}\nTotal Hours: ${selectedTotalHours}\nTimeline: ${timeline.weeks} weeks\n\nPlease review and let me know if you have any questions.\n\nBest regards`
              );
              const mailtoLink = `mailto:michael@santacruzstudios.com?subject=${subject}&body=${body}`;
              
              // Generate and download PDF first
              exportToSOWPDF(pdfData);
              
              // Open email client
              window.location.href = mailtoLink;
            }}
            className="flex items-center gap-3 px-6 py-4 bg-portfolio-blue text-white rounded-lg font-semibold text-lg hover:bg-portfolio-blue-dark transition-all shadow-lg hover:shadow-xl"
          >
            <FileText className="w-5 h-5" />
            Send for Review
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-white/50 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-700">
            <strong>Ready to send to:</strong> michael@santacruzstudios.com
          </p>
          <p className="text-xs text-gray-600 mt-1">
            The PDF includes all project details, timeline, milestones, and terms ready for review and approval.
          </p>
        </div>
      </div>
    </div>
  );
}
