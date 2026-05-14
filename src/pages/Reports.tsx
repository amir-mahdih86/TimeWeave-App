import { useAllCompletions, useTasksForDateRange } from "@/hooks/use-tasks";
import { Navigation } from "@/components/Navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfWeek, startOfMonth, addDays, isSameDay } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useSettings } from "@/hooks/use-settings";

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const { data: allCompletions } = useAllCompletions();
  const { settings } = useSettings();
  
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate the date range based on the selected period
  const dateRange = useMemo(() => {
    const today = new Date();
    
    switch (reportPeriod) {
      case 'daily':
        return {
          start: selectedDate,
          end: selectedDate,
          dates: [selectedDate]
        };
      case 'weekly':
        const weekStartDay = settings.weekStartsOn === '0' ? 0 : 6; // Sunday or Saturday
        const weekStart = startOfWeek(today, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
        const weekEnd = today;
        return {
          start: weekStart,
          end: weekEnd,
          dates: eachDayOfInterval({ start: weekStart, end: weekEnd })
        };
      case 'monthly':
        const monthStart = startOfMonth(today);
        const monthEnd = today;
        return {
          start: monthStart,
          end: monthEnd,
          dates: eachDayOfInterval({ start: monthStart, end: monthEnd })
        };
      default:
        return {
          start: today,
          end: today,
          dates: [today]
        };
    }
  }, [reportPeriod, selectedDate, settings.weekStartsOn]);

  // Fetch tasks for the date range
  const { data: tasksMap, isLoading: loadingTasks } = useTasksForDateRange(
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd')
  );

  // Calculate stats based on the selected period
  const stats = useMemo(() => {
    if (!tasksMap || !allCompletions) return { 
      timeCompletionRate: 0,
      taskCompletionRate: 0,
      totalTasks: 0, 
      completed: 0, 
      totalTimeMinutes: 0, 
      completedTimeMinutes: 0 
    };

    let totalTasks = 0;
    let totalCompleted = 0;
    let totalTimeMinutes = 0;
    let completedTimeMinutes = 0;

    // Calculate stats for each day in the date range
    dateRange.dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get tasks for this day from the map
      const dayTasks = tasksMap.get(dateStr) || [];

      // Get completions for this day
      const dayCompletions = allCompletions.filter(c => c.date === dateStr);
      
      // Add to totals
      totalTasks += dayTasks.length;

      // Calculate time for each task
      dayTasks.forEach(task => {
        const [startH, startM] = task.startTime.split(':').map(Number);
        const [endH, endM] = task.endTime.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);
        totalTimeMinutes += duration;

        // Check if this task is completed
        const completion = dayCompletions.find(c => c.taskId === task.id);
        if (completion?.isDone) {
          totalCompleted++;
          completedTimeMinutes += duration;
        }
      });
    });

    const timeCompletionRate = totalTimeMinutes > 0 ? Math.round((completedTimeMinutes / totalTimeMinutes) * 100) : 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return {
      timeCompletionRate,
      taskCompletionRate,
      totalTasks,
      completed: totalCompleted,
      totalTimeMinutes,
      completedTimeMinutes
    };
  }, [tasksMap, allCompletions, dateRange]);

  // Calculate activity data for charts (only for weekly and monthly)
  const activityData = useMemo(() => {
    if (!tasksMap || !allCompletions || reportPeriod === 'daily') return [];

    // For weekly and monthly, show daily breakdown
    return dateRange.dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get tasks for this day from the map
      const dayTasks = tasksMap.get(dateStr) || [];

      // Get completions for this day
      const dayCompletions = allCompletions.filter(c => c.date === dateStr);
      
      // Count completed and pending tasks for this day
      let completedCount = 0;
      let pendingCount = 0;
      
      dayTasks.forEach(task => {
        const completion = dayCompletions.find(c => c.taskId === task.id);
        if (completion?.isDone) {
          completedCount++;
        } else {
          pendingCount++;
        }
      });
      
      return {
        day: reportPeriod === 'weekly' ? format(date, 'EEE') : format(date, 'MMM d'),
        fullDay: format(date, 'EEEE, MMM d'), // Full day name for tooltip
        completed: completedCount,
        pending: pendingCount
      };
    });
  }, [tasksMap, allCompletions, dateRange, reportPeriod]);

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{payload[0].payload.fullDay}</p>
          <p className="text-xs text-green-600">Done: {payload[0].payload.completed}</p>
          <p className="text-xs text-orange-600">Pending: {payload[0].payload.pending}</p>
        </div>
      );
    }
    return null;
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (reportPeriod) {
      case 'daily':
        return `Daily Report - ${format(selectedDate, 'MMM d, yyyy')}`;
      case 'weekly':
        return `Weekly Report - ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d')}`;
      case 'monthly':
        return `Monthly Report - ${format(dateRange.start, 'MMMM yyyy')}`;
      default:
        return 'Report';
    }
  };

  const getEmptyStateMessage = () => {
    switch (reportPeriod) {
      case 'daily':
        return 'No tasks for this day';
      case 'weekly':
        return 'No tasks this week';
      case 'monthly':
        return 'No tasks this month';
      default:
        return 'No tasks found';
    }
  };



  if (loadingTasks) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">{getPeriodLabel()}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Period Selector */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Period</label>
              <Select value={reportPeriod} onValueChange={(value: ReportPeriod) => setReportPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker for Daily Reports */}
            {reportPeriod === 'daily' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date</label>
                <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-semibold text-sm">
                    {isSameDay(selectedDate, new Date()) ? "Today, " : ""}
                    {format(selectedDate, "EEE MMM d")}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {stats.totalTasks === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{getEmptyStateMessage()}</h3>
              <p className="text-muted-foreground mb-4">
                Create some tasks to see your productivity insights here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Enhanced Task Overview Section */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Two Progress Rings */}
                <div className="flex items-center justify-around gap-4">
                  {/* Time-based completion */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="hsl(var(--muted))"
                          strokeWidth="8"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="hsl(142 76% 36%)"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats.timeCompletionRate / 100) * 251.2} 251.2`}
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-green-600">{stats.timeCompletionRate}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-muted-foreground">Time Based</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(stats.completedTimeMinutes / 60 * 10) / 10}h / {Math.round(stats.totalTimeMinutes / 60 * 10) / 10}h
                      </p>
                    </div>
                  </div>

                  {/* Task-based completion */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="hsl(var(--muted))"
                          strokeWidth="8"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="hsl(217 91% 60%)"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats.taskCompletionRate / 100) * 251.2} 251.2`}
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">{stats.taskCompletionRate}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-muted-foreground">Task Based</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.completed} / {stats.totalTasks} tasks
                      </p>
                    </div>
                  </div>
                </div>

                {/* Task Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-2 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{stats.totalTasks}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-400">Done</p>
                    <p className="text-lg font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-400">Pending</p>
                    <p className="text-lg font-bold text-orange-600">{stats.totalTasks - stats.completed}</p>
                  </div>
                </div>

                {/* Time Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Focus Time
                    </span>
                    <span>
                      {Math.round(stats.completedTimeMinutes / 60 * 10) / 10}h of {Math.round(stats.totalTimeMinutes / 60 * 10) / 10}h
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${stats.timeCompletionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Chart - Only show for weekly and monthly */}
            {reportPeriod !== 'daily' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    {reportPeriod === 'weekly' ? 'Weekly Activity' : 'Monthly Activity'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar 
                        dataKey="completed" 
                        fill="hsl(142 76% 36%)" 
                        radius={[4, 4, 0, 0]}
                        name="Completed"
                      />
                      <Bar 
                        dataKey="pending" 
                        fill="hsl(25 95% 53%)" 
                        radius={[4, 4, 0, 0]}
                        name="Pending"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </main>

      <Navigation />
    </div>
  );
}
