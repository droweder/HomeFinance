import type { Express } from "express";
import { createServer, type Server } from "http";
// All database operations are now handled via Supabase client on frontend

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple API health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running. All data operations handled via Supabase.' });
  });

  // All authentication and data operations are handled via Supabase on frontend
  // This server now only serves static files and provides a health check

  const httpServer = createServer(app);
  return httpServer;
}
