// Storage is no longer needed since all operations go through Supabase client
// This file exists only for compatibility with existing imports

export class MemStorage {
  // This is a placeholder class since all data operations 
  // are handled via Supabase client on the frontend
  constructor() {
    console.log('Using Supabase for all database operations');
  }
}

export const storage = new MemStorage();
