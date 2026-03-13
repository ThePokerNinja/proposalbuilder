import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, Users, MessageSquare, CheckCircle, Plus, List, Grid, X, Trash2, StickyNote } from 'lucide-react';
import { Task, CalendarEvent } from '../types';

interface TimelineCalendarProps {
  tasks: Task[];
  timeline: { weeks: number; startDate: Date; endDate: Date };
  projectName: string;
}

export function TimelineCalendar({ timeline, projectName }: TimelineCalendarProps) {
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [newMeeting, setNewMeeting] = useState({ name: '', date: new Date(), time: '09:00' });

  // Initialize default milestones
  useEffect(() => {
    if (events.length === 0) {
      const defaultEvents: CalendarEvent[] = [
        { id: 'kickoff', name: 'Kickoff Meeting', date: timeline.startDate, type: 'meeting', isCustom: false },
        { id: 'discovery', name: 'Discovery Complete', date: new Date(timeline.startDate.getTime() + 7 * 24 * 60 * 60 * 1000), type: 'milestone', isCustom: false },
        { id: 'design-review', name: 'Design Review', date: new Date(timeline.startDate.getTime() + Math.floor(timeline.weeks * 7 * 0.4) * 24 * 60 * 60 * 1000), type: 'review', isCustom: false },
        { id: 'dev-review', name: 'Development Review', date: new Date(timeline.startDate.getTime() + Math.floor(timeline.weeks * 7 * 0.7) * 24 * 60 * 60 * 1000), type: 'review', isCustom: false },
        { id: 'final-review', name: 'Final Review', date: new Date(timeline.endDate.getTime() - 7 * 24 * 60 * 60 * 1000), type: 'review', isCustom: false },
        { id: 'launch', name: 'Project Launch', date: timeline.endDate, type: 'milestone', isCustom: false },
      ];
      setEvents(defaultEvents);
    }
  }, [timeline, events.length]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddMeeting = () => {
    if (!newMeeting.name.trim() || !newMeeting.date) return;

    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    const meetingDate = new Date(newMeeting.date);
    meetingDate.setHours(hours, minutes, 0, 0);

    const newEvent: CalendarEvent = {
      id: `custom-${Date.now()}`,
      name: newMeeting.name,
      date: meetingDate,
      type: 'meeting',
      isCustom: true,
    };

    setEvents([...events, newEvent].sort((a, b) => a.date.getTime() - b.date.getTime()));
    setNewMeeting({ name: '', date: new Date(), time: '09:00' });
    setShowAddMeeting(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event?.isCustom && window.confirm(`Delete "${event.name}"?`)) {
      // If synced with Google Calendar, remove it
      if (event.googleCalendarId) {
        syncToGoogleCalendar(event, 'delete');
      }
      setEvents(events.filter(e => e.id !== eventId));
    }
  };

  const handleSaveNotes = (eventId: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, notes: editingNotes } : e
    ));
    setEditingEventId(null);
    setEditingNotes('');
  };

  const handleEditNotes = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditingNotes(event.notes || '');
  };

  const syncToGoogleCalendar = async (event: CalendarEvent, action: 'add' | 'update' | 'delete') => {
    try {
      if (action === 'delete' && event.googleCalendarId) {
        // For deletion, we'd need the Google Calendar API
        // For now, just remove the local reference
        setEvents(events.map(e => 
          e.id === event.id ? { ...e, googleCalendarId: undefined } : e
        ));
        return;
      }

      const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(event.date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const title = encodeURIComponent(`${event.name} - ${projectName}`);
      const details = encodeURIComponent(
        event.notes 
          ? `Project event for ${projectName}\n\nNotes: ${event.notes}`
          : `Project event for ${projectName}`
      );

      if (action === 'add' || action === 'update') {
        // Open Google Calendar in new tab
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
        window.open(url, '_blank');
        
        // In a real implementation, you'd use the Google Calendar API here
        // For now, we'll just mark it as synced conceptually
        if (action === 'add') {
          setEvents(events.map(e => 
            e.id === event.id ? { ...e, googleCalendarId: `gc-${Date.now()}` } : e
          ));
        }
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
    }
  };

  const generateGoogleCalendarLink = (event: CalendarEvent) => {
    const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(event.date.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`${event.name} - ${projectName}`);
    const details = encodeURIComponent(
      event.notes 
        ? `Project event for ${projectName}\n\nNotes: ${event.notes}`
        : `Project event for ${projectName}`
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  // Month view calculations
  const currentMonth = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const renderMonthView = () => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isInTimeline = date >= timeline.startDate && date <= timeline.endDate;

            return (
              <div
                key={date.getTime()}
                className={`aspect-square border border-gray-200 rounded-lg p-1 text-xs ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                } ${!isInTimeline ? 'opacity-40' : ''}`}
              >
                <div className={`font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(event => {
                    const color = event.type === 'meeting' ? 'bg-blue-500' : event.type === 'review' ? 'bg-purple-500' : 'bg-green-500';
                    return (
                      <div
                        key={event.id}
                        className={`${color} text-white px-1 py-0.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80`}
                        title={event.name}
                        onClick={() => handleEditNotes(event)}
                      >
                        {event.name}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-gray-500 text-[10px]">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <>
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {events.map((event) => {
            const Icon = event.type === 'meeting' ? Users : event.type === 'review' ? MessageSquare : CheckCircle;
            const isPast = event.date < new Date();
            const daysFromStart = Math.floor((event.date.getTime() - timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={event.id}
                className={`relative rounded-lg border-2 transition-all ${
                  event.type === 'meeting'
                    ? 'bg-blue-50 border-blue-200'
                    : event.type === 'review'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-green-50 border-green-200'
                } ${isPast ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'meeting'
                      ? 'bg-blue-500'
                      : event.type === 'review'
                      ? 'bg-purple-500'
                      : 'bg-green-500'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{event.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${
                          event.type === 'meeting'
                            ? 'bg-blue-100 text-blue-700'
                            : event.type === 'review'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {event.type === 'meeting' ? 'Meeting' : event.type === 'review' ? 'Review' : 'Milestone'}
                        </span>
                        {event.isCustom && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.date)} at {formatTime(event.date)}
                      </span>
                      <span>Week {Math.ceil(daysFromStart / 7)}</span>
                    </div>

                    {/* Notes Section */}
                    {editingEventId === event.id ? (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-300">
                        <textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Add notes..."
                          className="w-full text-xs border-0 focus:ring-0 resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              setEditingEventId(null);
                              setEditingNotes('');
                            }}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(event.id)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {event.notes && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs text-gray-700">
                            <div className="flex items-start gap-2">
                              <StickyNote className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="flex-1">{event.notes}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleEditNotes(event)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-white rounded transition-colors"
                          >
                            <StickyNote className="w-3 h-3" />
                            {event.notes ? 'Edit Notes' : 'Add Notes'}
                          </button>
                          <a
                            href={generateGoogleCalendarLink(event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => syncToGoogleCalendar(event, event.googleCalendarId ? 'update' : 'add')}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-700"
                          >
                            <Calendar className="w-3 h-3" />
                            {event.googleCalendarId ? 'Update' : 'Sync'} Calendar
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Meeting Button */}
        <button
          onClick={() => setShowAddMeeting(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-portfolio-blue text-white rounded-lg hover:bg-portfolio-blue-dark transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Meeting
        </button>
      </>
    );
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Timeline & Calendar</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="flex items-center">{timeline.weeks} weeks</span>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'month' : 'list')}
            className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={viewMode === 'list' ? 'Switch to Month View' : 'Switch to List View'}
          >
            {viewMode === 'list' ? (
              <Grid className="w-4 h-4 text-gray-600" />
            ) : (
              <List className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {viewMode === 'list' ? renderListView() : renderMonthView()}
      </div>

      {/* Timeline Bar */}
      <div className="mt-4 flex-shrink-0">
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          {events.map((event) => {
            const daysFromStart = Math.floor((event.date.getTime() - timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
            const percentage = Math.max(0, Math.min(100, (daysFromStart / (timeline.weeks * 7)) * 100));
            const color = event.type === 'meeting' ? '#3b82f6' : event.type === 'review' ? '#8b5cf6' : '#10b981';

            return (
              <div
                key={event.id}
                className="absolute top-0 h-full w-1"
                style={{ left: `${percentage}%`, backgroundColor: color }}
                title={event.name}
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

      {/* Add Meeting Modal */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New Meeting</h3>
              <button
                onClick={() => setShowAddMeeting(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Name</label>
                <input
                  type="text"
                  value={newMeeting.name}
                  onChange={(e) => setNewMeeting({ ...newMeeting, name: e.target.value })}
                  placeholder="e.g., Client Review, Team Sync"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newMeeting.date.toISOString().split('T')[0]}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: new Date(e.target.value) })}
                  min={timeline.startDate.toISOString().split('T')[0]}
                  max={timeline.endDate.toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-portfolio-blue focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMeeting(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMeeting}
                disabled={!newMeeting.name.trim()}
                className="px-4 py-2 bg-portfolio-blue text-white rounded-lg hover:bg-portfolio-blue-dark disabled:opacity-50 transition-colors font-medium"
              >
                Add Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
