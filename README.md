# AuthFlow - Secure Authentication Application

A full-stack authentication application built with SvelteKit, PostgreSQL, and modern web technologies. Features secure email-based authentication, email verification, password reset functionality, and user profile management.

## 🚀 Features

- **Secure Authentication**: Email and password-based user registration and login
- **Email Verification**: Account activation through email verification
- **Password Reset**: Secure password reset via email links
- **Session Management**: Database-stored sessions (no JWT)
- **Protected Routes**: Authentication guards for secure pages
- **User Profiles**: Profile viewing and editing functionality
- **AI Chatbot**: Powered by Google Gemini for intelligent conversations
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Content Security Policy**: Secure CSP configuration for Auth.js compatibility

## 🛠️ Technology Stack

- **Frontend**: SvelteKit with Svelte 5
- **Authentication**: Auth.js (latest version)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: TailwindCSS with responsive design
- **Email Service**: Gmail + Nodemailer
- **Validation**: Zod schemas for type-safe validation
- **Password Hashing**: bcryptjs with 12+ salt rounds
- **Security**: Content Security Policy (CSP) with Auth.js compatibility

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mydatabase"

# Authentication
AUTH_SECRET="your-auth-secret-key-here"
AUTH_URL="http://localhost:5173"

# Gmail Configuration
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

# AI Services
GEMINI_API_KEY="your_gemini_api_key_here"

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

### 5. AI Chatbot Setup

To enable the AI chatbot feature:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add your API key to the `.env` file:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
3. The chatbot will be available at `/dashboard/chatbot` for authenticated users

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 🔒 Security Configuration

### Content Security Policy (CSP)

AuthFlow includes a secure CSP configuration that allows Auth.js to function properly while maintaining security:

- **Production CSP**: Restrictive policy with minimal permissions
- **Development CSP**: More permissive for development tools (HMR, etc.)
- **Auth.js Compatibility**: Includes `unsafe-eval` directive required by Auth.js
- **TailwindCSS Support**: Includes `unsafe-inline` for styles

The CSP configuration is located in `src/lib/csp.ts` and is applied dynamically based on the environment.

### CSP Directives

```typescript
// Production CSP
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // Required for Auth.js
  'style-src': ["'self'", "'unsafe-inline'"], // Required for TailwindCSS
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}
```

## 📁 Project Structure

```
AuthFlow/
├── src/
│   ├── lib/
│   │   ├── db/           # Database configuration and schema
│   │   ├── validations/  # Zod validation schemas
│   │   ├── utils/        # Utility functions
│   │   └── csp.ts        # Content Security Policy configuration
│   ├── routes/
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Protected dashboard pages
│   │   └── api/          # API endpoints
│   └── app.css          # Global styles with TailwindCSS
├── tests/               # Test files
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
- `npm run test:db` - Test database connection
- `npm run test:login` - Test login flow
- `npm run test:otp` - Test OTP functionality

## 🔐 Security Features

- **Password Security**: bcryptjs with 12+ salt rounds
- **Session Management**: Secure database-stored sessions
- **Input Validation**: Server-side validation with Zod
- **CSRF Protection**: Built-in CSRF protection
- **Rate Limiting**: Authentication endpoint rate limiting
- **Email Verification**: Required before account activation
- **Secure Tokens**: Time-limited verification tokens
- **Content Security Policy**: Secure CSP with Auth.js compatibility

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mydatabase"
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

### Security Considerations

- The CSP configuration automatically adapts to production/development environments
- `unsafe-eval` is required for Auth.js functionality but is limited to your domain
- All other security directives are set to maximum security

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
