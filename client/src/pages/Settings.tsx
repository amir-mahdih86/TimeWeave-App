import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Clock, Calendar, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettings } from "@/hooks/use-settings";

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [clearDataConfirm, setClearDataConfirm] = useState(false);

  const handleClearAllData = async () => {
    if (!clearDataConfirm) {
      setClearDataConfirm(true);
      setTimeout(() => setClearDataConfirm(false), 5000);
      return;
    }

    try {
      // Clear IndexedDB data
      const dbName = 'timeweave-db';
      const deleteReq = indexedDB.deleteDatabase(dbName);
      
      deleteReq.onsuccess = () => {
        alert('All data cleared successfully. Please refresh the page.');
        window.location.reload();
      };
      
      deleteReq.onerror = () => {
        alert('Error clearing data. Please try again.');
      };
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">Customize your TimeWeave experience</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Time & Date Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time & Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select 
                value={settings.timeFormat} 
                onValueChange={(value: '12' | '24') => updateSettings({ timeFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24-hour (14:30)</SelectItem>
                  <SelectItem value="12">12-hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStart">Week starts on</Label>
              <Select 
                value={settings.weekStartsOn} 
                onValueChange={(value: '0' | '6') => updateSettings({ weekStartsOn: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showCompleted">Show completed tasks</Label>
                <p className="text-xs text-muted-foreground">
                  Display completed tasks with strikethrough
                </p>
              </div>
              <Switch
                id="showCompleted"
                checked={settings.showCompletedTasks}
                onCheckedChange={(checked) => updateSettings({ showCompletedTasks: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clear All Data</Label>
              <p className="text-xs text-muted-foreground">
                This will permanently delete all your tasks, schedules, and settings.
              </p>
              
              {clearDataConfirm && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Are you sure? This action cannot be undone. Click the button again to confirm.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                variant={clearDataConfirm ? "destructive" : "outline"}
                onClick={handleClearAllData}
                className="w-full"
              >
                {clearDataConfirm ? "Confirm: Clear All Data" : "Clear All Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">TimeWeave</h3>
              <p className="text-sm text-muted-foreground">Smart Weekly Planner</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Built with React, TypeScript, and IndexedDB
              </p>
            </div>
          </CardContent>
        </Card>

      </main>

      <Navigation />
    </div>
  );
}