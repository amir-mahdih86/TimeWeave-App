## Packages
date-fns | Powerful date manipulation and formatting library
idb | Promise-based wrapper for IndexedDB to handle offline storage
recharts | Beautiful charts for the reports page
framer-motion | Smooth animations for tasks and transitions
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind CSS classes safely

## Notes
This is an offline-first PWA.
Data persistence uses 'idb' (IndexedDB).
No backend API calls for tasks - all logic is client-side.
Service Worker logic is handled by vite-plugin-pwa (assumed configuration in vite.config.ts).
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
}
