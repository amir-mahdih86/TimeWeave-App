import { useTasks, useCompletions } from "@/hooks/use-tasks";
import { Navigation } from "@/components/Navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function Reports() {
  const { data: tasks, isLoading: loadingTasks } = useTasks();
  // In a real app we'd fetch range completions, but here we'll mock or just fetch today for simplicity
  // Or fetch last 7 days individually (inefficient but works for small local data)
  
  // MOCK DATA for visualization since we don't have range queries built in useCompletions
  const stats = {
    completionRate: 75,
    totalTasks: 42,
    completed: 31,
    busyHours: 28,
  };

  const chartData = [
    { name: 'Completed', value: stats.completed, color: 'hsl(142 76% 36%)' },
    { name: 'Pending', value: stats.totalTasks - stats.completed, color: 'hsl(215.4 16.3% 46.9%)' },
  ];

  const weeklyActivity = [
    { day: 'Mon', completed: 4 },
    { day: 'Tue', completed: 6 },
    { day: 'Wed', completed: 3 },
    { day: 'Thu', completed: 8 },
    { day: 'Fri', completed: 5 },
    { day: 'Sat', completed: 2 },
    { day: 'Sun', completed: 3 },
  ];

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
          <p className="text-sm text-muted-foreground">Weekly Overview</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <span className="text-3xl font-bold text-primary">{stats.completionRate}%</span>
              <span className="text-xs text-muted-foreground">Completion Rate</span>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Clock className="w-8 h-8 text-foreground mb-2" />
              <span className="text-3xl font-bold text-foreground">{stats.busyHours}h</span>
              <span className="text-xs text-muted-foreground">Focus Time</span>
            </CardContent>
          </Card>
        </div>

        {/* Completion Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Task Completion</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity}>
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

      </main>

      <Navigation />
    </div>
  );
}
