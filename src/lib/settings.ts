// Settings management using localStorage
export interface AppSettings {
  timeFormat: '12' | '24';
  weekStartsOn: '0' | '6'; // 0 = Sunday, 6 = Saturday
  showCompletedTasks: boolean;
  notificationsEnabled: boolean;
  reminderLeadMinutes: number; // minutes before task start
  alarmStyle: 'notification' | 'alarm';
}

const SETTINGS_KEY = 'timeweave-settings';

const defaultSettings: AppSettings = {
  timeFormat: '24',
  weekStartsOn: '0',
  showCompletedTasks: true,
  notificationsEnabled: true,
  reminderLeadMinutes: 5,
  alarmStyle: 'alarm',
};

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function formatTime(time: string, format: '12' | '24' = '24'): string {
  if (format === '24') return time;
  
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getWeekStartDay(weekStartsOn: '0' | '6'): number {
  return parseInt(weekStartsOn);
}