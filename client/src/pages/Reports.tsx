import { useTasks, useAllCompletions, useTasksForDateRange } from "@/hooks/use-tasks";
import { Navigation } from "@/components/Navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Clock, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
    if (!tasksMap || !allCompletions) return { completionRate: 0, totalTasks: 0, completed: 0, busyHours: 0 };

    let totalTasks = 0;
    let totalCompleted = 0;
    let totalBusyMinutes = 0;

    // Calculate stats for each day in the date range
    dateRange.dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get tasks for this day from the map
      const dayTasks = tasksMap.get(dateStr) || [];

      // Get completions for this day
      const dayCompletions = allCompletions.filter(c => c.date === dateStr && c.isDone);
      
      // Add to totals
      totalTasks += dayTasks.length;
      totalCompleted += dayCompletions.length;

      // Calculate busy time for this day
      const dayBusyMinutes = dayTasks.reduce((total, task) => {
        const [startH, startM] = task.startTime.split(':').map(Number);
        const [endH, endM] = task.endTime.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);
        return total + duration;
      }, 0);
      
      totalBusyMinutes += dayBusyMinutes;
    });

    const busyHours = Math.round(totalBusyMinutes / 60 * 10) / 10;
    const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return {
      completionRate,
      totalTasks,
      completed: totalCompleted,
      busyHours
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
      const dayCompletions = allCompletions.filter(c => c.date === dateStr && c.isDone);
      
      return {
        day: reportPeriod === 'weekly' ? format(date, 'EEE') : format(date, 'MMM d'),
        total: dayTasks.length,
        completed: dayCompletions.length
      };
    });
  }, [tasksMap, allCompletions, dateRange, reportPeriod]);

  const chartData = useMemo(() => [
    { name: 'Completed', value: stats.completed, color: 'hsl(142 76% 36%)' },
    { name: 'Pending', value: stats.totalTasks - stats.completed, color: 'hsl(215.4 16.3% 46.9%)' },
  ], [stats]);

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

  const getCompletionLabel = () => {
    switch (reportPeriod) {
      case 'daily':
        return 'Daily Completion';
      case 'weekly':
        return 'Weekly Completion';
      case 'monthly':
        return 'Monthly Completion';
      default:
        return 'Completion Rate';
    }
  };

  const getFocusTimeLabel = () => {
    switch (reportPeriod) {
      case 'daily':
        return 'Daily Focus Time';
      case 'weekly':
        return 'Weekly Focus Time';
      case 'monthly':
        return 'Monthly Focus Time';
      default:
        return 'Focus Time';
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
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <TrendingUp className="w-8 h-8 text-primary mb-2" />
                  <span className="text-3xl font-bold text-primary">{stats.completionRate}%</span>
                  <span className="text-xs text-muted-foreground">{getCompletionLabel()}</span>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <Clock className="w-8 h-8 text-foreground mb-2" />
                  <span className="text-3xl font-bold text-foreground">{stats.busyHours}h</span>
                  <span className="text-xs text-muted-foreground">{getFocusTimeLabel()}</span>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Task Completion Section */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Ring and Stats */}
                <div className="flex items-center justify-between">
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
                        strokeDasharray={`${(stats.completionRate / 100) * 251.2} 251.2`}
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-green-600">{stats.completionRate}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 ml-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Tasks</span>
                      <span className="font-semibold">{stats.totalTasks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <span className="font-semibold text-green-600">{stats.completed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className="font-semibold text-orange-600">{stats.totalTasks - stats.completed}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{stats.completed} of {stats.totalTasks} tasks</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">Completed</p>
                      <p className="text-sm font-bold text-green-800 dark:text-green-300">{stats.completed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Pending</p>
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-300">{stats.totalTasks - stats.completed}</p>
                    </div>
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
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Bar 
                        dataKey="completed" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
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
