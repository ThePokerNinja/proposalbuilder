import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Task } from '../types';
import { Calendar, Clock, CheckCircle2, Circle } from 'lucide-react';
import { Sphere3DVisualization } from './Sphere3DVisualization';

interface EstimateVisualizationProps {
  tasks: Task[];
  totalHours: number;
  timeline: { weeks: number; startDate: Date; endDate: Date };
  onTaskMultiplierChange: (taskId: string, multiplier: number) => void;
  onTasksChange?: (updatedTasks: Task[]) => void;
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444'];

export function EstimateVisualization({
  tasks,
  totalHours,
  timeline,
  onTaskMultiplierChange,
  onTasksChange,
}: EstimateVisualizationProps) {
  // Initialize selected state - all tasks selected by default
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set(tasks.map((t) => t.id))
  );

  // Update tasks with selected state
  const tasksWithSelection = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      selected: selectedTaskIds.has(task.id),
    }));
  }, [tasks, selectedTaskIds]);

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
      const updated = tasks.map((t) => ({
        ...t,
        selected: newSelected.has(t.id),
      }));
      onTasksChange(updated);
    }
  };

  const chartData = tasksWithSelection
    .map((task) => ({
      name: task.name,
      hours: Math.round(task.baseHours * task.multiplier),
      category: task.category,
      multiplier: task.multiplier,
      taskId: task.id,
      selected: task.selected,
    }))
    .sort((a, b) => b.hours - a.hours);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

      {/* Horizontal Milestone Breakdown */}
      <div className="bg-gray-50 rounded-xl p-8 shadow-md mb-8 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Project Milestones Breakdown</h3>
        <p className="text-base text-gray-600 mb-6 font-medium">Select tasks to include in your estimate</p>
        
        <div className="space-y-4">
          {milestoneData.map((milestone) => {
            const selectedCount = milestone.tasks.filter((t) => t.selected).length;
            const totalCount = milestone.tasks.length;
            
            return (
              <div key={milestone.category} className="bg-white rounded-lg p-6 border-2 border-gray-200 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-lg text-gray-900">{milestone.category}</h4>
                    <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
                      ({selectedCount}/{totalCount} tasks selected)
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-portfolio-blue">
                      {Math.round(milestone.selectedHours)}h
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {milestone.selectedPercentage.toFixed(1)}% of selected
                    </p>
                  </div>
                </div>
                
                {/* Horizontal percentage bar */}
                <div className="relative h-10 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-portfolio-blue to-portfolio-blue-dark rounded-lg transition-all duration-300"
                    style={{ width: `${milestone.selectedPercentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 z-10">
                      {milestone.selectedPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Task checkboxes */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {milestone.tasks.map((task) => {
                    const taskHours = Math.round(task.baseHours * task.multiplier);
                    return (
                      <label
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
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
                          <CheckCircle2 className="w-6 h-6 text-portfolio-blue flex-shrink-0" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{task.name}</p>
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

      {/* 3D Sphere Visualization */}
      <div className="mb-8">
        <Sphere3DVisualization
          tasks={tasksWithSelection.filter(t => t.selected !== false)}
          onTaskHoursChange={handleTaskHoursChange}
        />
      </div>

      {/* Main Content: Chart (2/3) + Sidebar (1/3) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Bar Chart - 2/3 width */}
        <div className="flex-[2] space-y-6">
          {/* Bar Chart */}
          <div className="bg-gray-50 rounded-xl p-8 shadow-md border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Selected Tasks Breakdown</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart 
                data={chartData.filter((d) => d.selected)} 
                layout="vertical" 
                margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
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
                  width={110}
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} hours`, 'Estimated Hours']}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="hours" radius={[0, 8, 8, 0]}>
                  {chartData.filter((d) => d.selected).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.selected ? COLORS[index % COLORS.length] : '#d1d5db'}
                      opacity={entry.selected ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline Visualization */}
          <div className="bg-gray-50 rounded-xl p-8 shadow-md border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Project Timeline</h3>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">{formatDate(timeline.startDate)}</span>
                <span className="text-sm font-medium text-gray-700">{formatDate(timeline.endDate)}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-portfolio-blue to-portfolio-blue-dark rounded-full transition-all duration-300"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="mt-4 text-center">
                <span className="text-base text-gray-700 font-semibold">
                  Estimated completion in {timeline.weeks} {timeline.weeks === 1 ? 'week' : 'weeks'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Adjustable Sliders Sidebar - 1/3 width */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-xl p-8 shadow-md border border-gray-200 sticky top-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Adjust Estimates</h3>
            <div className="space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {tasksWithSelection.map((task) => {
                const currentHours = Math.round(task.baseHours * task.multiplier);
                const percentage = Math.round((task.multiplier - 1) * 100);
                const isAdjusted = task.multiplier !== 1;
                return (
                  <div 
                    key={task.id} 
                    className={`bg-white rounded-lg p-5 border-2 shadow-sm hover:shadow-md transition-all ${
                      task.selected 
                        ? 'border-portfolio-blue bg-blue-50' 
                        : 'border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-base mb-1">{task.name}</h4>
                          <p className="text-xs text-gray-600 font-medium">{task.category}</p>
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.selected}
                            onChange={() => handleTaskToggle(task.id)}
                            className="sr-only"
                          />
                          {task.selected ? (
                            <CheckCircle2 className="w-6 h-6 text-portfolio-blue" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400" />
                          )}
                        </label>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-xl font-bold ${
                          task.selected ? 'text-portfolio-blue' : 'text-gray-400'
                        }`}>
                          {currentHours}h
                        </span>
                        {isAdjusted && (
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            percentage > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {percentage > 0 ? '+' : ''}{percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={task.multiplier}
                        onChange={(e) => onTaskMultiplierChange(task.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-portfolio-blue hover:accent-portfolio-blue-dark transition-all"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>-50%</span>
                        <span className="text-gray-400">Base: {task.baseHours}h</span>
                        <span>+100%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
