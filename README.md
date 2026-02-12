# 👁️ Haunted Crd

A Discord-style platform focused on anonymity, privacy, and pure darkness aesthetic.

## 🌑 Features

- **Anonymous Communication**: Mask your identity with anonymous mode
- **Dark Theme**: Pure black interface with minimal aesthetics
- **Real-time Messaging**: WebSocket-powered instant communication
- **File Sharing**: Upload and share media, documents, and more
- **Server System**: Create and join private servers
- **Admin Panel**: Secure admin dashboard for platform management
- **Badge System**: Earn and display achievement badges
- **Privacy First**: End-to-end encryption and data protection

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS with custom dark theme
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: WebSockets (Socket.io)
- **Authentication**: JWT + bcrypt
- **File Storage**: Local + S3-compatible

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.example` for all required environment variables.

## 📁 Project Structure

```
haunted-crd/
├── app/                 # Next.js app router pages
├── components/          # React components
├── lib/                 # Shared utilities
├── server/              # Backend API routes
├── prisma/              # Database schema and migrations
├── middleware/          # Custom middleware
├── utils/               # Helper functions
├── types/               # TypeScript type definitions
└── uploads/             # File upload directory
```

## 🔐 Security

- CSRF protection
- XSS sanitization
- Rate limiting
- Brute force protection
- Secure headers
- Encrypted sensitive data

## 📜 License

MIT License - see LICENSE file for details.
