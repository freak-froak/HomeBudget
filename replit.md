# ExpenseJournal - Personal Finance Management Application

## Overview

ExpenseJournal is a modern, full-stack personal finance management application inspired by fintech apps like Mint and YNAB. The application helps users track expenses, manage budgets, set financial goals, and receive AI-powered insights. Built with a React frontend and Express backend, it features a responsive design that works across desktop, mobile, and tablet devices with clean, financial-focused UI using calming greens and trustworthy blues for light theme, and warm, comfortable "homie" colors for dark theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom CSS variables for theme support
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Internationalization**: Custom i18n system with context-based language switching

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript for full-stack type safety
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL with connection pooling
- **Authentication**: Session-based authentication with bcrypt password hashing
- **File Upload**: Multer middleware for receipt and image uploads
- **API Structure**: RESTful endpoints organized by feature domains

### Database Design
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Migration Management**: Drizzle Kit for database migrations and schema management
- **Tables**: Users, expenses, categories, budgets, goals, notifications, sessions
- **Relationships**: Proper foreign key relationships with cascade deletes
- **Data Types**: Support for JSONB fields for flexible user settings and widget customizations

### Authentication & Security
- **Session Management**: Server-side sessions with configurable expiration
- **Password Security**: bcrypt hashing with salt rounds
- **Authorization**: Route-level protection with middleware
- **CORS**: Configured for cross-origin requests with credentials

### Theme & Customization System
- **Theme Switching**: Light/dark/system theme support with CSS variables
- **Widget Customization**: Configurable dashboard widgets with borders, colors, and layouts
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Glass Morphism**: Modern UI effects with backdrop blur and subtle gradients

### AI Integration Architecture
- **AI Service**: OpenAI GPT integration for expense categorization and financial advice
- **Features**: Automatic expense categorization, spending insights, financial advisor chatbot
- **Data Processing**: AI analysis of expense descriptions, amounts, and locations
- **Response Handling**: Structured JSON responses for consistent data processing

### File Management
- **Upload System**: Local file storage with unique naming using UUID
- **File Types**: Support for images (JPEG, PNG, WebP) and PDF receipts
- **Size Limits**: 10MB file size limit with type validation
- **Organization**: Separate handling for receipt images and lifestyle photos

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database with connection pooling
- **Authentication**: bcryptjs for password hashing and session management
- **File Processing**: Multer for multipart form data and file uploads
- **Date Handling**: date-fns for date manipulation and formatting
- **Validation**: Zod for runtime type validation and schema definition

### UI & Styling
- **Component Library**: Radix UI primitives for accessible base components
- **Styling Framework**: Tailwind CSS with PostCSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration (Inter, DM Sans, Geist Mono, etc.)
- **Class Management**: clsx and tailwind-merge for conditional styling

### Development Tools
- **Type Checking**: TypeScript with strict configuration
- **Build Process**: Vite with React plugin and error overlay
- **Development**: tsx for TypeScript execution in development
- **Bundling**: esbuild for server-side bundling in production

### AI & External Services
- **OpenAI API**: GPT integration for expense analysis and financial advice
- **Currency Data**: Built-in currency service with exchange rate support
- **Geolocation**: Planned Google Places API integration for automatic address fetching

### Session Storage
- **Session Store**: connect-pg-simple for PostgreSQL session storage
- **Session Security**: Configurable session expiration and cleanup

### Replit Integration
- **Development**: Replit-specific plugins for cartographer and runtime error modal
- **Deployment**: Configured for Replit hosting environment