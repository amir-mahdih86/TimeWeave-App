import { type Task, type InsertTask } from "@shared/schema";

export interface IStorage {
  // Minimal server storage just to keep the server running without errors.
  // The actual app logic is client-side offline.
  healthCheck(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export const storage = new MemStorage();
