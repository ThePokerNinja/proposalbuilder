import React from 'react';
import { Calendar, Clock, Users, MessageSquare, CheckCircle } from 'lucide-react';
import { Task } from '../types';

interface TimelineCalendarProps {
  tasks: Task[];
  timeline: { weeks: number; startDate: Date; endDate: Date };
  projectName: string;
}

export function TimelineCalendar({ tasks, timeline, projectName }: TimelineCalendarProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate milestone dates based on task categories
  const milestones = [
    { name: 'Kickoff Meeting', date: timeline.startDate, type: 'meeting', icon: Users },
    { name: 'Discovery Complete', date: new Date(timeline.startDate.getTime() + 7 * 24 * 60 * 60 * 1000), type: 'milestone', icon: CheckCircle },
    { name: 'Design Review', date: new Date(timeline.startDate.getTime() + Math.floor(timeline.weeks * 7 * 0.4) * 24 * 60 * 60 * 1000), type: 'review', icon: MessageSquare },
    { name: 'Development Review', date: new Date(timeline.startDate.getTime() + Math.floor(timeline.weeks * 7 * 0.7) * 24 * 60 * 60 * 1000), type: 'review', icon: MessageSquare },
    { name: 'Final Review', date: new Date(timeline.endDate.getTime() - 7 * 24 * 60 * 60 * 1000), type: 'review', icon: MessageSquare },
    { name: 'Project Launch', date: timeline.endDate, type: 'milestone', icon: CheckCircle },
  ];

  const generateGoogleCalendarLink = (event: { name: string; date: Date; type: string }) => {
    const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(event.date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`${event.name} - ${projectName}`);
    const details = encodeURIComponent(`Project milestone for ${projectName}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Timeline & Calendar</h3>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{timeline.weeks} weeks</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {milestones.map((milestone, index) => {
          const Icon = milestone.icon;
          const isPast = milestone.date < new Date();
          const daysFromStart = Math.floor((milestone.date.getTime() - timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const percentage = (daysFromStart / (timeline.weeks * 7)) * 100;

          return (
            <div
              key={index}
              className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                milestone.type === 'meeting'
                  ? 'bg-blue-50 border-blue-200'
                  : milestone.type === 'review'
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-green-50 border-green-200'
              } ${isPast ? 'opacity-60' : ''}`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                milestone.type === 'meeting'
                  ? 'bg-blue-500'
                  : milestone.type === 'review'
                  ? 'bg-purple-500'
                  : 'bg-green-500'
              }`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-gray-900 truncate">{milestone.name}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ml-2 ${
                    milestone.type === 'meeting'
                      ? 'bg-blue-100 text-blue-700'
                      : milestone.type === 'review'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {milestone.type === 'meeting' ? 'Meeting' : milestone.type === 'review' ? 'Review' : 'Milestone'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(milestone.date)}
                  </span>
                  <span>Week {Math.ceil(daysFromStart / 7)}</span>
                </div>
              </div>

              <a
                href={generateGoogleCalendarLink(milestone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg hover:border-portfolio-blue hover:bg-blue-50 transition-colors text-xs font-medium text-gray-700"
              >
                Add
              </a>
            </div>
          );
        })}
      </div>

      {/* Timeline Bar */}
      <div className="mt-4">
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          {milestones.map((milestone, index) => {
            const daysFromStart = Math.floor((milestone.date.getTime() - timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
            const percentage = Math.max(0, Math.min(100, (daysFromStart / (timeline.weeks * 7)) * 100));
            const color = milestone.type === 'meeting' ? '#3b82f6' : milestone.type === 'review' ? '#8b5cf6' : '#10b981';
            
            return (
              <div
                key={index}
                className="absolute top-0 h-full w-1"
                style={{ left: `${percentage}%`, backgroundColor: color }}
                title={milestone.name}
              />
            );
          })}
          <div className="absolute inset-0 bg-gradient-to-r from-portfolio-blue to-portfolio-blue-dark opacity-30" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>{formatDate(timeline.startDate)}</span>
          <span>{formatDate(timeline.endDate)}</span>
        </div>
      </div>
    </div>
  );
}
