import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Clock, Calendar, Trash2, Loader2, CheckCircle, BellRing } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettings } from "@/hooks/use-settings";
import { useQueryClient } from "@tanstack/react-query";
import { isNative, safeInvoke } from "@/lib/native";
import { syncTaskAlarms } from "@/lib/task-alarms";

interface PermissionStatus {
  notifications: boolean;
  exact_alarms: boolean;
  battery_exempt: boolean;
}

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const queryClient = useQueryClient();
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);

  const refreshPermissions = useCallback(async () => {
    const status = await safeInvoke<PermissionStatus>("get_permission_status");
    setPermissions(status);
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    void refreshPermissions();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshPermissions();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshPermissions]);

  const handleGrantNotifications = async () => {
    await safeInvoke<boolean>("request_notification_permission");
    setTimeout(() => void refreshPermissions(), 1500);
  };

  const handleExactAlarmSettings = () => {
    void safeInvoke("open_exact_alarm_settings");
    setTimeout(() => void refreshPermissions(), 1500);
  };

  const handleBatteryExemption = async () => {
    await safeInvoke<boolean>("request_ignore_battery_optimizations");
    setTimeout(() => void refreshPermissions(), 1500);
  };

  const handleClearAllData = async () => {
    if (!clearDataConfirm) {
      setClearDataConfirm(true);
      setTimeout(() => setClearDataConfirm(false), 5000);
      return;
    }

    setClearDataConfirm(false);
    setIsClearing(true);

    try {
      // Clear IndexedDB data
      const dbName = 'timeweave-db';
      indexedDB.deleteDatabase(dbName);
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Reset states
      setIsClearing(false);
      setClearSuccess(true);
      
      // Show success message for 2 seconds then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
      setIsClearing(false);
      setClearDataConfirm(false);
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

        {/* Reminders & Alarms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              Reminders &amp; Alarms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isNative() && (
              <Alert>
                <AlertDescription>
                  Notifications and alarms are available in the Android app.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notificationsEnabled">Task reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Notify me for every scheduled task
                </p>
              </div>
              <Switch
                id="notificationsEnabled"
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => {
                  updateSettings({ notificationsEnabled: checked });
                  void syncTaskAlarms();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadMinutes">Remind me</Label>
              <Select
                value={String(settings.reminderLeadMinutes)}
                onValueChange={(value: string) => {
                  updateSettings({ reminderLeadMinutes: Number(value) });
                  void syncTaskAlarms();
                }}
                disabled={!settings.notificationsEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Exactly at start time</SelectItem>
                  <SelectItem value="1">1 minute before</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="10">10 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alarmStyle">Default reminder style</Label>
              <Select
                value={settings.alarmStyle}
                onValueChange={(value: 'notification' | 'alarm') => {
                  updateSettings({ alarmStyle: value });
                  void syncTaskAlarms();
                }}
                disabled={!settings.notificationsEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">Heads-up notification</SelectItem>
                  <SelectItem value="alarm">Full-screen alarm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.alarmStyle === 'alarm' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="alarmOnlyWhenLocked">Alarm only when screen is off</Label>
                    <p className="text-xs text-muted-foreground">
                      While you are using the phone, show a regular notification instead of
                      taking over the screen
                    </p>
                  </div>
                  <Switch
                    id="alarmOnlyWhenLocked"
                    checked={settings.alarmOnlyWhenLocked}
                    onCheckedChange={(checked) => {
                      updateSettings({ alarmOnlyWhenLocked: checked });
                      void syncTaskAlarms();
                    }}
                    disabled={!settings.notificationsEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="snoozeMinutes">Snooze duration</Label>
                  <Select
                    value={String(settings.snoozeMinutes)}
                    onValueChange={(value: string) => {
                      updateSettings({ snoozeMinutes: Number(value) });
                      void syncTaskAlarms();
                    }}
                    disabled={!settings.notificationsEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {settings.alarmStyle === 'alarm' && (
              <p className="text-xs text-muted-foreground">
                The alarm turns the screen on, rings and vibrates until dismissed.
                Tasks can override this behavior with their own Reminder option.
              </p>
            )}

            {isNative() && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>System permissions</Label>

                {(
                  [
                    {
                      key: "notifications",
                      label: "Notifications",
                      granted: permissions?.notifications,
                      action: handleGrantNotifications,
                    },
                    {
                      key: "exact_alarms",
                      label: "Exact alarms",
                      granted: permissions?.exact_alarms,
                      action: handleExactAlarmSettings,
                    },
                    {
                      key: "battery_exempt",
                      label: "Run while screen is off",
                      granted: permissions?.battery_exempt,
                      action: handleBatteryExemption,
                    },
                  ] as const
                ).map(row => (
                  <div key={row.key} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    {row.granted === true ? (
                      <span className="text-sm text-green-600 dark:text-green-400">Allowed</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={row.action}>
                        {row.granted === false ? "Allow" : "Check"}
                      </Button>
                    )}
                  </div>
                ))}

                <p className="text-xs text-muted-foreground pt-1">
                  Grant all three so alarms fire reliably when the screen is off.
                </p>
              </div>
            )}
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
              
              {clearDataConfirm && !clearSuccess && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Are you sure? This action cannot be undone. Click the button again to confirm.
                  </AlertDescription>
                </Alert>
              )}
              
              {clearSuccess && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    All data cleared successfully! Refreshing...
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                variant={(clearDataConfirm || isClearing) ? "destructive" : "outline"}
                onClick={handleClearAllData}
                className="w-full"
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing data...
                  </>
                ) : clearSuccess ? (
                  "Clear All Data"
                ) : clearDataConfirm ? (
                  "Confirm: Clear All Data"
                ) : (
                  "Clear All Data"
                )}
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