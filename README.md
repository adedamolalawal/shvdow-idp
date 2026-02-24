# 🔐 Shvdow IDP

**Shadow Identity Provider with Admin-Controlled Maintenance Mode**

A modern, secure Identity Provider (IDP) system built with Node.js and Express, featuring a comprehensive admin-controlled maintenance mode system.

## ✨ Features

### 🔧 **Maintenance Mode System**
- **Admin-controlled toggle** - Enable/disable maintenance mode instantly
- **Custom maintenance messages** - Set personalized messages for users
- **Fail-safe design** - Defaults to operational if status cannot be determined
- **Admin bypass** - Admin interface remains accessible during maintenance
- **Real-time status updates** - Live status monitoring and control
- **Maintenance history** - Track all maintenance mode changes

### 🛡️ **Security Features**
- JWT-based admin authentication
- Rate limiting on all endpoints
- Helmet.js security headers
- CORS protection
- Input validation and sanitization
- Secure password hashing with bcrypt

### 🎨 **Modern Admin Interface**
- Beautiful, responsive web interface
- Real-time status monitoring
- One-click maintenance mode toggle
- Custom message management
- System health monitoring
- Maintenance history viewer

### 🚀 **Production Ready**
- SQLite database with automatic initialization
- Graceful shutdown handling
- Comprehensive error handling
- Environment-based configuration
- Docker support
- Health check endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shvdow-idp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the admin panel**
   - Open http://localhost:3000/admin
   - Default credentials: `admin` / `admin123`
   - **⚠️ Change these in production!**

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DB_PATH` | Database file path | `./data/shvdow.db` |
| `JWT_SECRET` | JWT signing secret | `fallback-secret-change-this` |
| `ADMIN_USERNAME` | Admin username | `admin` |
| `ADMIN_PASSWORD` | Admin password | `admin123` |
| `DEFAULT_MAINTENANCE_MESSAGE` | Default maintenance message | `System is currently under maintenance...` |

### Security Configuration

**🚨 Important for Production:**
1. Change default admin credentials
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up HTTPS
5. Use environment variables for secrets

## 📚 API Documentation

### Admin Authentication

#### Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Verify Token
```http
GET /api/admin/verify
Authorization: Bearer <token>
```

### Maintenance Mode Management

#### Get Status
```http
GET /api/admin/maintenance/status
Authorization: Bearer <token>
```

#### Enable Maintenance Mode
```http
POST /api/admin/maintenance/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Custom maintenance message (optional)"
}
```

#### Disable Maintenance Mode
```http
POST /api/admin/maintenance/disable
Authorization: Bearer <token>
```

#### Toggle Maintenance Mode
```http
POST /api/admin/maintenance/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Custom message (optional)"
}
```

#### Update Maintenance Message
```http
PUT /api/admin/maintenance/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "New maintenance message"
}
```

### System Information

#### Health Check
```http
GET /health
```

#### System Status
```http
GET /status
```

## 🐳 Docker Deployment

### Using Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     shvdow-idp:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - JWT_SECRET=your-production-secret
         - ADMIN_PASSWORD=your-secure-password
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

2. **Start the service**
   ```bash
   docker-compose up -d
   ```

### Using Docker

```bash
# Build the image
docker build -t shvdow-idp .

# Run the container
docker run -d \
  --name shvdow-idp \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-production-secret \
  -e ADMIN_PASSWORD=your-secure-password \
  -v $(pwd)/data:/app/data \
  shvdow-idp
```

## 🔍 Monitoring

### Health Checks

The system provides several endpoints for monitoring:

- **`/health`** - Basic health check (always available)
- **`/status`** - System status (always available)
- **`/api/admin/health`** - Detailed health info (admin only)

### Maintenance Mode Behavior

When maintenance mode is enabled:

- ✅ **Admin routes** - Always accessible (`/admin`, `/api/admin/*`)
- ✅ **Health checks** - Always accessible (`/health`, `/status`)
- ❌ **User routes** - Return 503 Service Unavailable
- ❌ **API routes** - Return maintenance mode JSON response
- ❌ **Web routes** - Show maintenance page

## 🛠️ Development

### Project Structure

```
src/
├── admin/              # Admin web interface
│   ├── index.html     # Admin panel HTML
│   ├── admin.css      # Styles
│   └── admin.js       # Frontend JavaScript
├── config/            # Configuration
│   ├── index.js       # Main config
│   └── database.js    # Database setup
├── controllers/       # Route controllers
│   └── maintenanceController.js
├── middleware/        # Express middleware
│   ├── adminAuth.js   # Admin authentication
│   └── maintenanceCheck.js # Maintenance mode checks
├── routes/           # API routes
│   └── admin.js      # Admin routes
├── services/         # Business logic
│   └── maintenanceMode.js # Maintenance mode service
└── app.js           # Main application
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic restarts.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**⚠️ Security Notice:** Always change default credentials and secrets in production environments!
