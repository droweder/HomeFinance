# Personal Finance Management Application

## Overview

This is a full-stack personal finance management application built with React, Express, and Supabase. The application allows users to track expenses, income, categories, and accounts with features like installment management, AI financial insights, CSV import/export, and real-time synchronization with Supabase. Successfully migrated from Bolt to Replit with performance optimizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: React Context API for global state management
- **Data Fetching**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component system

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL) for real-time data synchronization
- **Authentication**: Supabase Auth with email/password authentication
- **Session Management**: Supabase session management
- **Performance**: Optimistic updates and intelligent caching to reduce database load

### Database Schema
The application uses PostgreSQL with the following main tables:
- `users`: User accounts with email and hashed passwords
- `expenses`: Expense tracking with installment support
- `income`: Income tracking with source categorization
- `categories`: User-defined categories for income/expenses
- `accounts`: Financial accounts with initial balances

## Key Components

### Authentication System
- Email/password authentication using Passport.js
- Secure password hashing with bcrypt
- Session-based authentication with persistent storage
- User registration and login flows

### Financial Data Management
- **Expense Tracking**: Detailed expense records with categories, payment methods, locations, and installment support
- **Income Tracking**: Income records with sources and account associations
- **Category Management**: User-defined categories for both income and expenses
- **Account Management**: Financial account tracking with balance calculations

### Advanced Features
- **Installment Management**: Support for tracking installment payments over time
- **Credit Card Integration**: Special handling for credit card transactions
- **AI Financial Assistant**: Integration with Gemini AI for financial insights and analysis
- **CSV Import/Export**: Bulk data management capabilities
- **Dark/Light Theme**: User preference-based theming

## Data Flow

### Frontend to Backend
1. React components interact with Context providers
2. Context providers make API calls to Express routes
3. Express routes use Drizzle ORM to interact with PostgreSQL
4. Results flow back through the same chain

### Database Integration
- Drizzle ORM handles all database operations with type safety
- Connection pooling through Neon serverless PostgreSQL
- Automatic migrations and schema management

### External Synchronization
- Supabase integration for real-time data synchronization
- Offline capability with retry mechanisms
- Connection status monitoring and error handling

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **@supabase/supabase-js**: Real-time data synchronization
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database ORM
- **bcryptjs**: Password hashing
- **passport**: Authentication middleware

### UI Dependencies
- **@radix-ui/react-***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette component

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for Node.js

## Deployment Strategy

### Development Environment
- Vite development server for frontend hot reloading
- tsx for running TypeScript backend with hot reloading
- Replit integration with runtime error overlay

### Production Build
1. Frontend built with Vite to static assets
2. Backend compiled with esbuild to single JavaScript file
3. Assets served by Express with proper routing
4. Database migrations applied via Drizzle Kit

### Environment Configuration
- Database URL configuration for PostgreSQL connection
- Session secret for authentication security
- Supabase credentials for real-time synchronization
- AI service API keys for financial insights

The application follows a monorepo structure with shared TypeScript types between frontend and backend, ensuring type safety across the entire application stack. The architecture supports both development and production deployments with proper error handling, logging, and monitoring capabilities.

## Recent Changes (July 2025)

### Migration and Performance Optimizations
- ✅ Successfully migrated from Bolt to Replit environment
- ✅ Maintained Supabase as primary database backend (user preference)
- ✅ Fixed data loading to ensure ALL records from income/expenses tables are loaded
- ✅ Implemented optimistic updates for better user responsiveness
- ✅ Optimized Dashboard component with useMemo to prevent unnecessary recalculations
- ✅ Reduced excessive logging in useFinanceCalculations hook
- ✅ Corrected "due_date" field mapping to use "date" column consistently
- ✅ Enhanced FinanceContext with intelligent caching and loading states

### Latest Updates (July 19, 2025)
- ✅ Enhanced CSV import with transfer support and upload blocking
- ✅ Created PostgreSQL transfers table with proper indexes and constraints
- ✅ Updated ImportCSV component to support expenses, income, and transfers
- ✅ Implemented upload progress tracking with visual feedback
- ✅ Added dialog blocking mechanism to prevent closure during data upload
- ✅ Enhanced validation with transfer-specific rules (account validation, same-account prevention)
- ✅ Added real-time progress updates during bulk data processing
- ✅ **AI Interface Improvements**: Simplified FinancialAIChat to use only Gemini API
- ✅ **Settings Streamlined**: Removed all AI providers except Gemini for cleaner configuration
- ✅ **Enhanced UX**: Added quick question buttons and improved visual feedback
- ✅ **Code Quality**: Fixed all syntax errors and function duplications in AI components
- ✅ **Performance**: Optimized AI context building and response handling
- ✅ **Browser Icon**: Created custom SVG favicon with financial theme for brand recognition
- ✅ **Reload Prevention**: Implemented debouncing and duplicate prevention to eliminate involuntary app reloads
- ✅ **Persistent Storage**: Added localStorage for filters, API keys, and AI chat history with cross-tab sync
- ✅ **Expense Grouping**: Enhanced installment grouping with visual differentiation and consolidated display
- ✅ **Custom Toast System**: Implemented beautiful notification system for API keys, actions and confirmations
- ✅ **Enhanced UX**: Replaced browser alerts with styled toast notifications for better user experience
- ✅ **Bolt.new Compatibility**: Removed all Neon/PostgreSQL dependencies for exclusive Supabase operation
- ✅ **Server Simplification**: Converted to static file server since all database operations use Supabase client
- ✅ **Netlify Ready**: Created netlify.toml, _headers, _redirects and deployment guide for seamless Netlify deployment
- ✅ **JAMstack Architecture**: Converted to pure frontend application with Supabase backend for optimal Netlify performance
- ✅ **Sticky Table Headers**: Implemented fixed headers in Expenses, Income, and Transfers tables for better UX during scrolling
- ✅ **AI Error Handling**: Fixed undefined .toFixed() errors and replaced browser alerts with elegant toast notifications
- ✅ **Compact Layout**: Integrated total cards into filter bar for Expenses and Income pages saving vertical space
- ✅ **Dashboard Enhancements**: Added credit card analysis by month, unpaid expenses tracker, and biggest expense indicator
- ✅ **Improved Metrics**: New dashboard layout with 7 key indicators including credit card spending visualization