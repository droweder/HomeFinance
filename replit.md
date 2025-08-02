# Personal Finance Management Application

## Overview
This is a full-stack personal finance management application that enables users to track expenses, income, categories, and accounts. It includes features such as installment management, AI financial insights, CSV import/export, and real-time synchronization. The project aims to provide comprehensive financial tracking and analysis capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with Tailwind CSS (shadcn/ui system)
- **State Management**: React Context API
- **Data Fetching**: TanStack React Query

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL) for real-time synchronization
- **Authentication**: Supabase Auth (email/password)
- **Session Management**: Supabase session management
- **Performance**: Optimistic updates and intelligent caching.
- **ORM**: Drizzle ORM for type-safe database operations.

### Key Features
- **Financial Data Management**: Comprehensive tracking of expenses, income, categories, and financial accounts.
- **Advanced Features**: Installment management, credit card specific handling, AI financial insights via Gemini AI, CSV import/export, and dark/light theme support.
- **Data Flow**: React components interact with Context providers, which make API calls to Express routes. Express routes use Drizzle ORM to interact with PostgreSQL.
- **Synchronization**: Supabase integration for real-time data synchronization with offline capabilities and retry mechanisms.
- **Monorepo Structure**: Shared TypeScript types between frontend and backend for end-to-end type safety.
- **Performance Optimizations**: Monthly data filtering and advanced pagination significantly reduce dataset processing for UI rendering.
- **Dedicated Credit Card System**: Separate system for credit card management with its own table, context, forms, and navigation.
- **AI Financial Assistant**: Reformulated AI assistant using real user data (expenses, income, transfers) for personalized insights via native Google Gemini API integration.
- **Notifications**: Consistent toast notification system for financial edits, settings, and confirmations.
- **Dashboard Enhancements**: Credit card analysis, unpaid expenses tracker, biggest expense indicator, and period labels.
- **Persistent Storage**: `localStorage` for filters, API keys, and AI chat history with cross-tab synchronization.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless connection
- **@supabase/supabase-js**: Real-time data synchronization
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database ORM
- **bcryptjs**: Password hashing
- **passport**: Authentication middleware
- **@radix-ui/react-***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette component
- **vite**: Build tool
- **typescript**: Type checking
- **tsx**: TypeScript execution for Node.js
- **Google Gemini API**: For AI financial insights.