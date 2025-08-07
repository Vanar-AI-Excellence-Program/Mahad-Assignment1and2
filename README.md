# AuthFlow - Secure Authentication Application

A full-stack authentication application built with SvelteKit, PostgreSQL, and modern web technologies. Features secure email-based authentication, email verification, password reset functionality, and user profile management.

## 🚀 Features

- **Secure Authentication**: Email and password-based user registration and login
- **Email Verification**: Account activation through email verification
- **Password Reset**: Secure password reset via email links
- **Session Management**: Database-stored sessions (no JWT)
- **Protected Routes**: Authentication guards for secure pages
- **User Profiles**: Profile viewing and editing functionality
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Type Safety**: Full TypeScript implementation with Zod validation

## 🛠️ Technology Stack

- **Frontend**: SvelteKit with Svelte 5
- **Authentication**: Auth.js (latest version)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: TailwindCSS with responsive design
- **Email Service**: Gmail + Nodemailer
- **Validation**: Zod schemas for type-safe validation
- **Password Hashing**: bcryptjs with 12+ salt rounds

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Gmail account with App Password

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd AuthFlow
npm install
```

### 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/authflow"

# Authentication
AUTH_SECRET="your-auth-secret-key-here"
AUTH_URL="http://localhost:5173"

# Gmail Configuration
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

# Application
PUBLIC_APP_URL="http://localhost:5173"
```

### 3. Database Setup

Generate and run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `GMAIL_APP_PASSWORD`

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📁 Project Structure

```
AuthFlow/
├── src/
│   ├── lib/
│   │   ├── db/           # Database configuration and schema
│   │   ├── validations/  # Zod validation schemas
│   │   └── utils/        # Utility functions
│   ├── routes/
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Protected dashboard pages
│   │   └── api/          # API endpoints
│   └── app.css          # Global styles with TailwindCSS
├── drizzle/             # Database migrations
├── static/              # Static assets
└── env.example          # Environment variables template
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check the project
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

## 🔐 Security Features

- **Password Security**: bcryptjs with 12+ salt rounds
- **Session Management**: Secure database-stored sessions
- **Input Validation**: Server-side validation with Zod
- **CSRF Protection**: Built-in CSRF protection
- **Rate Limiting**: Authentication endpoint rate limiting
- **Email Verification**: Required before account activation
- **Secure Tokens**: Time-limited verification tokens

## 📧 Email Features

- **Account Verification**: Email verification during signup
- **Password Reset**: Secure password reset via email
- **Professional Templates**: HTML email templates
- **Token Management**: Secure token generation and validation
- **Gmail Integration**: Free tier (500 emails/day)

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Modern Interface**: Clean, professional appearance
- **Form Validation**: Real-time validation with error messages
- **Loading States**: User feedback during operations
- **Accessibility**: WCAG compliant components
- **Consistent Design**: Unified design system

## 🚀 Deployment

### Environment Variables

Ensure all environment variables are set in production:

```env
DATABASE_URL="your-production-database-url"
AUTH_SECRET="your-production-auth-secret"
AUTH_URL="https://your-domain.com"
GMAIL_USER="your-gmail-address"
GMAIL_APP_PASSWORD="your-gmail-app-password"
PUBLIC_APP_URL="https://your-domain.com"
```

### Database Migration

Run migrations in production:

```bash
npm run db:migrate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ using SvelteKit and modern web technologies**
