import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Weekly from "@/pages/Weekly";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import { isNative, safeInvoke } from "@/lib/native";
import { syncTaskAlarms } from "@/lib/task-alarms";

// Add safe area padding for mobile PWA
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-area-top safe-area-bottom">
      {children}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/weekly" component={Weekly} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    if (!isNative()) return;
    void (async () => {
      await safeInvoke("init_notifications");
      // Ask for POST_NOTIFICATIONS on first launch; Android shows the dialog
      // only when it is not granted yet.
      await safeInvoke<boolean>("request_notification_permission");
      await syncTaskAlarms();
    })();

    // Roll fixed-task alarm windows forward while the app is open.
    const interval = setInterval(() => void syncTaskAlarms(), 5 * 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncTaskAlarms();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
