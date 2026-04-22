# Backend Starter Pack - Complete Setup Guide

Get your production-ready backend running in 30 minutes.

## 📋 Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **MongoDB** - Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Git** ([Download](https://git-scm.com/))
- **Text Editor** - VS Code, WebStorm, etc.

**Verify Installation:**
```bash
node --version      # Should be v18+
npm --version       # Should be v9+
mongo --version     # For local MongoDB (optional)
```

---

## 🚀 5-Minute Quick Start

### 1. Copy Project Files
```bash
# Create new project
mkdir my-api
cd my-api
git init

# Copy starter pack files
cp -r /path/to/backend-starter-pack/* .
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values (see Configuration section below)
# nano .env  (or open in your editor)
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Verify Server
```bash
# In another terminal
curl http://localhost:5000/api/health
```

You should get a 200 response. **Done!** ✅

---

## 🔧 Configuration

### Environment Variables (.env)

Copy `.env.example` to `.env` and update these values:

```env
# Server
PORT=5000
NODE_ENV=development
LOG_LEVEL=debug

# Database - MongoDB Atlas (Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Database - Local MongoDB (Optional)
# MONGODB_URI=mongodb://localhost:27017/dbname

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-characters-long-change-this
JWT_EXPIRATION=7d

# CORS - Frontend URL
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Redis (Optional - for rate limiting & caching)
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-redis-password

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# File Upload - Cloudinary (Optional)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Bcrypt
BCRYPT_SALT_ROUND=10

# Frontend URL (for CORS & redirects)
FRONTEND_URL=http://localhost:3000

# API Keys (Optional Services)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

### Database Setup

#### Option A: MongoDB Atlas (Recommended for Production)

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Click "Create a New Project"
   - Click "Create a Database"
   - Choose "Free" tier
   - Wait for cluster to initialize (2-5 minutes)

3. **Get Connection String**
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Add to `.env` as `MONGODB_URI`

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username & password
   - Note: Use these in connection string

5. **Whitelist IP** (for development)
   - Go to "Network Access"
   - Click "Add IP Address"
   - Add your IP or `0.0.0.0/0` for development

**Connection String Format:**
```
mongodb+srv://username:password@cluster0.abc123.mongodb.net/dbname?retryWrites=true&w=majority
```

#### Option B: Local MongoDB (Development Only)

1. **Install MongoDB**
   ```bash
   # macOS (with Homebrew)
   brew install mongodb-community
   brew services start mongodb-community

   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb

   # Windows
   # Download installer from mongodb.com
   ```

2. **Start MongoDB**
   ```bash
   # Should show "waiting for connections on port 27017"
   mongod
   ```

3. **Add to .env**
   ```env
   MONGODB_URI=mongodb://localhost:27017/my_app_db
   ```

4. **Verify Connection**
   ```bash
   # In another terminal
   mongo
   > db.version()  # Should show version number
   ```

---

## 📦 Install & Configure Services

### Required Services
- ✅ Node.js & npm
- ✅ MongoDB (local or Atlas)

### Optional Services

#### Redis (For Rate Limiting & Caching)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:latest

# Verify
redis-cli ping  # Should respond with PONG
```

Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Cloudinary (For File Uploads)

1. **Create Account**
   - Go to [Cloudinary](https://cloudinary.com)
   - Sign up for free account

2. **Get API Keys**
   - Go to Dashboard
   - Copy: Cloud Name, API Key, API Secret

3. **Add to .env**
   ```env
   CLOUDINARY_NAME=your-name
   CLOUDINARY_API_KEY=your-key
   CLOUDINARY_API_SECRET=your-secret
   ```

---

## 📚 Project Structure Quick Tour

```
backend-starter-pack/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Start server (run this)
│   │
│   └── app/
│       ├── config/               # Configuration
│       │   ├── env.ts           # Environment variables
│       │   ├── database.ts       # MongoDB setup
│       │   └── rateLimit.ts      # Rate limiting
│       │
│       ├── core/                 # Enterprise utilities (NEW!)
│       │   ├── BaseRepository.ts # Generic data layer
│       │   ├── BaseService.ts    # Generic service layer
│       │   └── ... (4 more files)
│       │
│       ├── errorHelpers/         # Error handling
│       │   └── AppError.ts       # Custom error class
│       │
│       ├── middlewares/          # Express middlewares
│       │   ├── globalErrorHandler.ts
│       │   ├── auth.ts
│       │   └── ... (3 more)
│       │
│       ├── modules/              # Features (CRUD template)
│       │   ├── user/            # User module (reference)
│       │   ├── TEMPLATE/        # Copy this for new modules
│       │   └── ...
│       │
│       ├── routes/               # API routes
│       │   └── index.ts         # Route registration
│       │
│       └── utils/                # Utilities
│           ├── catchAsync.ts    # Async wrapper
│           ├── logger.ts        # Logging
│           └── ... (more)
│
├── .env.example                   # Environment template
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
│
├── README.md                       # Feature overview (START HERE!)
├── SETUP.md                        # This file
├── QUICK-REFERENCE.md             # Commands & patterns
├── ERROR-HANDLING.md              # Error guide
└── ENTERPRISE-UTILITIES.md        # Core patterns

```

---

## ✅ First Run Checklist

- [ ] Node.js v18+ installed
- [ ] npm installed
- [ ] MongoDB connection works
- [ ] `.env` file created and configured
- [ ] `npm install` completed
- [ ] `npm run dev` starts without errors
- [ ] `curl http://localhost:5000/api/health` returns 200
- [ ] No red errors in console

---

## 🎯 Next Steps

### For New Project (0 modules)
1. Read **README.md** - Understand architecture
2. Read **QUICK-REFERENCE.md** - Common patterns
3. Create your first module - Follow "Creating New Modules" in README
4. Deploy to production - See Deployment section

### For Existing Project (migrating)
1. Copy `src/app/core/` directory
2. Copy `src/init/di.ts` 
3. Update `src/server.ts` to call `setupDI()`
4. Refactor one module at a time (follow guides)

---

## 🐛 Troubleshooting Setup

### Error: "Cannot find module 'express'"
```bash
# Solution: Install dependencies
npm install

# If still fails:
rm -rf node_modules package-lock.json
npm install
```

### Error: "connect ECONNREFUSED 127.0.0.1:27017"
```bash
# MongoDB is not running

# Start MongoDB
# macOS:
brew services start mongodb-community

# Ubuntu:
sudo systemctl start mongodb

# Or use MongoDB Atlas (cloud)
```

### Error: "Port 5000 is already in use"
```bash
# Change port in .env
PORT=5001

# Or kill process using port 5000
# macOS/Linux:
lsof -ti :5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Error: "EACCES: permission denied" (Linux/macOS)
```bash
# Fix permissions
sudo chown -R $USER:$USER .
chmod -R u+w .
```

### Error: "TypeError: Cannot read property of undefined"
```bash
# Usually missing .env variable
# Check .env has all required variables
cat .env | grep MONGODB_URI
cat .env | grep JWT_SECRET
```

### Error: "ValidationError: ... is required"
```bash
# Check .env values are correct
# Some services (like Cloudinary) are optional
# Only set if you're using them
```

---

## 🔐 Security Setup

### Change JWT Secret
⚠️ **IMPORTANT for production:**
```env
# DON'T use this default!
JWT_SECRET=your-super-secret-key-min-32-characters-long-change-this

# Generate a random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use output as JWT_SECRET
```

### Secure Environment Variables
```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Production: Use environment variables
# Set via hosting provider (Heroku, Railway, Render, etc.)
```

### Configure CORS
```env
# Only allow your frontend
CORS_ORIGIN=https://yourdomain.com

# For development (multiple origins):
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## 🚀 Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

---

## 🌐 API Testing

### Using curl
```bash
# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# List users
curl http://localhost:5000/api/users

# Get single user
curl http://localhost:5000/api/users/USER_ID

# Update user
curl -X PATCH http://localhost:5000/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# Delete user
curl -X DELETE http://localhost:5000/api/users/USER_ID
```

### Using Postman
1. Import [Postman Collection](./postman-collection.json)
2. Set environment variables
3. Run requests

### Using VS Code REST Client Extension
Create `api.rest` file:
```
### Create User
POST http://localhost:5000/api/users
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com",
  "password": "securepass123"
}

### List Users
GET http://localhost:5000/api/users?page=1&limit=10

### Get Single User
GET http://localhost:5000/api/users/USER_ID
```

---

## 📈 Performance Tuning

### Increase Rate Limits for Development
```env
# .env
RATE_LIMIT_MAX=1000
```

### Enable/Disable CORS for Development
```env
CORS_ORIGIN=*
```

### Use Local MongoDB for Speed
```env
# Faster than Atlas for local development
MONGODB_URI=mongodb://localhost:27017/myapp
```

---

## 🔄 Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Check security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

---

## 📱 IDE Setup

### VS Code Extensions (Recommended)
- ES7+ React/Redux/React-Native snippets
- MongoDB for VS Code
- Thunder Client (API testing)
- REST Client
- Error Lens
- Prettier - Code formatter
- ESLint

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.exclude": {
    "node_modules": true,
    ".git": true
  }
}
```

---

## 🐳 Docker Setup (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://mongo:27017/myapp
    depends_on:
      - mongo
  
  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Run:
```bash
docker-compose up
```

---

## ✨ You're Ready!

Your backend is now set up. Next steps:

1. **Read README.md** - Understand all features
2. **Check QUICK-REFERENCE.md** - Common commands
3. **Create first module** - Follow the template
4. **Test endpoints** - Use Postman or curl
5. **Deploy to production** - When ready

---

## 📞 Need Help?

- Check **Troubleshooting** section above
- Read **ERROR-HANDLING.md** for error details
- Check MongoDB logs: `db.logs().find()`
- Check server logs in console output

---

**Happy coding!** 🚀
