# AuthFlow 🔐

> **Enterprise-Grade Authentication System Built with Modern Web Technologies**

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.0-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-0.44+-FF6B6B?logo=drizzle&logoColor=white)](https://orm.drizzle.team/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A production-ready, full-stack authentication application featuring secure user management, email verification, password reset, AI-powered chatbot, and enterprise-grade security. Built with SvelteKit 5, PostgreSQL, and modern web technologies.

## ✨ Features

### 🔐 **Authentication & Security**
- **Multi-Provider Auth**: Email/password, Google OAuth, GitHub OAuth
- **Email Verification**: Required account activation with secure tokens
- **Password Reset**: Time-limited secure reset via email
- **Session Management**: Database-stored sessions (no JWT vulnerabilities)
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Built-in cross-site request forgery protection

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Real-time Validation**: Instant form feedback with Zod schemas
- **Loading States**: Professional loading animations and feedback
- **Accessibility**: WCAG 2.1 AA compliant components
- **Dark/Light Mode**: Theme switching capability

### 🤖 **AI Integration**
- **Gemini Chatbot**: Google AI-powered intelligent conversations
- **Context Awareness**: Personalized responses based on user data
- **Multi-language Support**: Natural language processing capabilities

### 🏗️ **Architecture**
- **Type Safety**: Full TypeScript implementation
- **Modern ORM**: Drizzle ORM with type-safe database operations
- **API-First**: RESTful API endpoints with proper error handling
- **Modular Design**: Clean separation of concerns and reusable components

## 🛠️ Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Frontend** | SvelteKit | 5.0+ |
| **Language** | TypeScript | 5.0+ |
| **Styling** | TailwindCSS | 3.4+ |
| **Database** | PostgreSQL | 15+ |
| **ORM** | Drizzle | 0.44+ |
| **Authentication** | Auth.js | Latest |
| **Email** | Nodemailer + Gmail | Latest |
| **AI** | Google Gemini | Latest |
| **Validation** | Zod | Latest |
| **Security** | bcryptjs, CSP | Latest |

## 📋 Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Docker**: 20.10.0 or higher (for containerized development)
- **Git**: Latest version
- **Gmail Account**: For email functionality
- **Google AI Studio**: For Gemini API access

## 🚀 Quick Start

### 1. **Clone Repository**

```bash
git clone https://github.com/yourusername/authflow.git
cd authflow
```

### 2. **Install Dependencies**

```bash
npm install
```

### 3. **Environment Configuration**

```bash
# Copy environment template
cp .env.example .env

# Generate secure secrets (recommended)
npm run generate-secrets
```

**Required Environment Variables:**

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mydatabase"

# Authentication Secrets
AUTH_SECRET="your-64-character-auth-secret"
AUTH_URL="http://localhost:5174"

# Email Configuration
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-character-app-password"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"

# Application Settings
PUBLIC_APP_URL="http://localhost:5174"
NODE_ENV="development"
```

### 4. **Database Setup with Docker**

```bash
# Start PostgreSQL container
npm run docker:up

# Wait for database to be ready (5 seconds)
npm run db:setup

# Verify database connection
npm run test:db
```

### 5. **Database Migrations**

```bash
# Generate new migrations (if schema changes)
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### 6. **Start Development Server**

```bash
npm run dev
```

Visit `http://localhost:5174` to access your application! 🎉

## 🐳 Docker Development

### **Container Management**

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Restart services
npm run docker:restart

# View logs
npm run docker:logs

# Check status
npm run docker:status

# Clean up (removes volumes)
npm run docker:clean

# Rebuild containers
npm run docker:rebuild
```

### **Docker Compose Configuration**

The project includes a `docker-compose.yml` file with:

- **PostgreSQL 15**: Latest stable version
- **Persistent Storage**: Data persists between container restarts
- **Port Mapping**: Database accessible on `localhost:5433`
- **Environment Variables**: Pre-configured for development

### **Database Connection Details**

```bash
Host: localhost
Port: 5433
Database: mydatabase
Username: postgres
Password: postgres
```

## 🗄️ Database Management

### **Drizzle ORM Commands**

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema changes directly (development only)
npm run db:push

# Open Drizzle Studio (web-based database GUI)
npm run db:studio

# Check database schema
npm run check:tables

# Verify database permissions
npm run check:permissions
```

### **Database Schema**

The application includes comprehensive database schemas for:

- **Users**: Authentication and profile data
- **Sessions**: Secure session management
- **Verification Tokens**: Email verification and password reset
- **User Roles**: Role-based access control

### **Migration Workflow**

```bash
# 1. Make changes to schema files
# 2. Generate migration
npm run db:generate

# 3. Review generated migration
# 4. Apply to database
npm run db:migrate

# 5. Verify changes
npm run check:tables
```

## 🔧 Available Scripts

### **Development**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type check with svelte-check
npm run check:watch  # Watch mode type checking
```

### **Database Operations**

```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply database migrations
npm run db:push      # Push schema changes
npm run db:studio    # Open Drizzle Studio
npm run db:setup     # Complete database setup
```

### **Testing & Validation**

```bash
npm run test:db              # Test database connection
npm run test:login           # Test authentication flow
npm run test:otp             # Test OTP functionality
npm run test:otp-comprehensive # Comprehensive OTP testing
npm run test:csp             # Test Content Security Policy
npm run check:tables         # Verify table structure
npm run check:permissions    # Check database permissions
```

### **Docker Operations**

```bash
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:restart # Restart services
npm run docker:logs    # View container logs
npm run docker:status  # Check container status
npm run docker:clean   # Remove containers and volumes
npm run docker:rebuild # Rebuild containers
```

### **Utility Scripts**

```bash
npm run generate-secrets  # Generate secure secrets
npm run setup-env         # Create environment file
npm run migrate:createdat # Migrate created_at fields
npm run fix:permissions   # Fix database permissions
```

## 🏗️ Project Structure

```
AuthFlow/
├── 📁 src/                          # Source code
│   ├── 📁 lib/                      # Shared libraries
│   │   ├── 📁 db/                   # Database configuration
│   │   │   ├── index.ts             # Database connection
│   │   │   ├── schema.ts            # Database schemas
│   │   │   └── migrations/          # Migration files
│   │   ├── 📁 validations/          # Zod validation schemas
│   │   ├── 📁 utils/                # Utility functions
│   │   ├── 📁 email/                # Email templates
│   │   └── csp.ts                   # Content Security Policy
│   ├── 📁 routes/                   # SvelteKit routes
│   │   ├── 📁 auth/                 # Authentication pages
│   │   ├── 📁 dashboard/            # Protected dashboard
│   │   ├── 📁 api/                  # API endpoints
│   │   └── 📁 admin/                # Admin panel
│   ├── 📁 app.html                  # HTML template
│   └── app.css                      # Global styles
├── 📁 tests/                        # Test files
├── 📁 scripts/                      # Build and utility scripts
├── 📁 drizzle/                      # Drizzle configuration
├── 📁 static/                       # Static assets
├── 📁 dist/                         # Build output
├── 📄 .env.example                  # Environment template
├── 📄 docker-compose.yml            # Docker configuration
├── 📄 vercel.json                   # Vercel deployment config
├── 📄 svelte.config.js              # SvelteKit configuration
├── 📄 vite.config.ts                # Vite configuration
├── 📄 tailwind.config.js            # TailwindCSS configuration
├── 📄 drizzle.config.ts             # Drizzle configuration
└── 📄 package.json                  # Dependencies and scripts
```

## 🔒 Security Features

### **Authentication Security**

- **Password Hashing**: bcryptjs with 12+ salt rounds
- **Session Management**: Secure database-stored sessions
- **Token Security**: Time-limited, cryptographically secure tokens
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Built-in cross-site request forgery protection

### **Content Security Policy**

```typescript
// Production CSP Configuration
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

### **Data Protection**

- **Input Validation**: Server-side validation with Zod schemas
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: Content Security Policy enforcement
- **Secure Headers**: Security-focused HTTP headers

## 📧 Email Configuration

### **Gmail Setup**

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. **Generate App Password**
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Use the 16-character password in your `.env` file

3. **Email Templates**
   - Professional HTML email templates
   - Responsive design for mobile devices
   - Branded with your application styling

### **Email Features**

- **Account Verification**: Required email verification
- **Password Reset**: Secure password reset links
- **Welcome Emails**: Professional onboarding experience
- **Notification System**: User activity notifications

## 🚀 Deployment

### **Vercel Deployment**

The project is configured for Vercel deployment with:

- **Vercel Adapter**: Optimized for serverless deployment
- **Node.js Runtime**: Configured for Node.js 20.x
- **Environment Variables**: Secure configuration management
- **Automatic Builds**: CI/CD integration

### **Environment Variables for Production**

```env
# Database (use production database)
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication
AUTH_SECRET="your-64-character-production-secret"
AUTH_URL="https://your-domain.com"

# Email
GMAIL_USER="your-production-email@gmail.com"
GMAIL_APP_PASSWORD="your-production-app-password"

# AI Services
GEMINI_API_KEY="your-production-gemini-key"

# Application
PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"
```

### **Database Migration in Production**

```bash
# Apply migrations
npm run db:migrate

# Verify schema
npm run check:tables
```

## 🧪 Testing

### **Test Categories**

- **Database Tests**: Connection and schema validation
- **Authentication Tests**: Login, registration, and OAuth flows
- **API Tests**: Endpoint functionality and error handling
- **Security Tests**: CSP and security header validation
- **Integration Tests**: End-to-end user workflows

### **Running Tests**

```bash
# Test database connection
npm run test:db

# Test authentication flow
npm run test:login

# Test OTP functionality
npm run test:otp

# Comprehensive testing
npm run test:otp-comprehensive
```

## 🔧 Troubleshooting

### **Common Issues**

#### **Database Connection Errors**
```bash
# Check if Docker is running
docker ps

# Verify database status
npm run docker:status

# Test connection
npm run test:db
```

#### **Build Errors**
```bash
# Clear build cache
rm -rf .svelte-kit dist

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### **Environment Issues**
```bash
# Verify environment file
cat .env

# Generate new secrets
npm run generate-secrets

# Check environment variables
npm run check:env
```

### **Debug Mode**

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check database logs
npm run docker:logs
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### **Development Workflow**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Code Standards**

- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Standard commit message format

### **Testing Requirements**

- **Unit Tests**: For utility functions and components
- **Integration Tests**: For API endpoints and workflows
- **E2E Tests**: For critical user journeys

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Getting Help**

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Code Examples**: Review the test files for usage examples

### **Community Resources**

- **SvelteKit Documentation**: [kit.svelte.dev](https://kit.svelte.dev/)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team/)
- **TailwindCSS**: [tailwindcss.com](https://tailwindcss.com/)
- **Auth.js**: [authjs.dev](https://authjs.dev/)

## 🙏 Acknowledgments

- **Svelte Team** for the amazing SvelteKit framework
- **Drizzle Team** for the type-safe ORM
- **Vercel** for the deployment platform
- **Google AI** for the Gemini integration
- **Open Source Community** for the incredible tools and libraries

---

<div align="center">

**Built with ❤️ using modern web technologies**

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.0-FF3E00?logo=svelte&logoColor=white&style=for-the-badge)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)

</div>
