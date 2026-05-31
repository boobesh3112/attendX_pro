import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";
import { NetworkStatus } from "./components/NetworkStatus";
import { GlobalBackground } from "./components/GlobalBackground";
import { seedDemoData } from "./utils/seedData";
import { themeManager } from "./utils/theme";
import { notificationManager } from "./utils/notifications";
import { themeSystem } from "./utils/themeSystem";

export default function App() {
  useEffect(() => {
    // Seed demo data on first load
    seedDemoData();

    // Apply saved accent color
    const accentColor = themeManager.getAccentColor();
    themeManager.applyAccentColor(accentColor);

    // Initialize notification manager
    notificationManager.checkScheduledNotifications();

    // Theme system is already initialized by themeSystem.ts
    // Just ensure it's applied
    themeSystem.reapplyTheme();
  }, []);

  return (
    <>
      {/* Global background - stays mounted, never recreated */}
      <GlobalBackground />

      {/* Network status indicator */}
      <NetworkStatus />

      {/* Main app router - with proper z-index layering */}
      <div className="relative z-10">
        <RouterProvider router={router} />
      </div>

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </>
  );
}