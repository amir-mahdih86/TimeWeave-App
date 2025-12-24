import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get('/api/health', async (req, res) => {
    res.json({ status: "ok" });
  });

  // The application is offline-first. 
  // All logic is handled client-side with IndexedDB/LocalStorage.
  // This server primarily acts as a static file host for the PWA.

  return httpServer;
}
