# Shadow IDP - Internal Developer Platform

A comprehensive Internal Developer Platform (IDP) that provides CI/CD, observability, developer experience, documentation, service catalog, alerting, and team management with a GitOps-first approach.

## 🚀 Features

### Core Capabilities
- **🔄 CI/CD Pipeline Management** - Automated build, test, and deployment workflows
- **📊 Comprehensive Observability** - Metrics, logs, traces, and custom dashboards
- **🎯 Service Catalog** - Centralized service discovery and metadata management
- **🚨 Intelligent Alerting** - Smart notifications with escalation policies
- **👥 Team Management** - Role-based access control and team hierarchies
- **📚 Documentation Engine** - Auto-generated docs and knowledge base
- **⚙️ GitOps Workflows** - Git-driven configuration and deployment management

### Technical Stack
- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js microservices architecture
- **Database**: PostgreSQL with Redis caching
- **Observability**: Prometheus + Grafana + Jaeger
- **Container**: Docker + Kubernetes
- **Authentication**: JWT with RBAC

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd shadow-idp
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration as needed
nano .env
```

### 3. Deploy the Platform
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy in development mode
./deploy.sh

# Or deploy in production mode
./deploy.sh --env production --pull
```

### 4. Access the Platform
- **Frontend Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

### 5. Default Login
- **Username**: `admin`
- **Password**: `password`

## 🏗️ Architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   GitOps Core   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Node.js)     │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 8081    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ CI/CD Engine │ │Service      │ │ Metrics    │
        │ Port: 8082   │ │Catalog      │ │ Collector  │
        │              │ │Port: 8083   │ │Port: 8084  │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Alert Engine │ │ Team Mgmt   │ │ Docs Engine│
        │ Port: 8085   │ │ Port: 8086  │ │Port: 8087  │
        └──────────────┘ └─────────────┘ └────────────┘
```

### Data Layer
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Prometheus    │
│   Port: 5432    │    │   Port: 6379    │    │   Port: 9090    │
│   (Primary DB)  │    │   (Cache/Queue) │    │   (Metrics)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Service Development
Each service is independently deployable:

```bash
# Start specific service
cd services/gitops-core
npm install
npm run dev

# Run service tests
npm test

# Build service
npm run build
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## 📊 Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Custom business metrics via Prometheus
- **Infrastructure Metrics**: System and container metrics
- **Performance Metrics**: Response times, throughput, error rates

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Log Aggregation**: Centralized log collection and search
- **Log Levels**: Configurable log levels per service

### Distributed Tracing
- **Request Tracing**: End-to-end request tracking
- **Performance Analysis**: Bottleneck identification
- **Dependency Mapping**: Service interaction visualization

## 🔐 Security

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Session Management**: Secure session handling with Redis

### Security Features
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: API rate limiting and DDoS protection
- **Input Validation**: Comprehensive input sanitization
- **Security Headers**: Standard security headers implementation

## 🚀 Deployment

### Docker Compose (Development)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes (Production)
```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/

# Check deployment status
kubectl get pods -n shadow-idp

# View service logs
kubectl logs -f deployment/api-gateway -n shadow-idp
```

### Environment Configuration
Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `JWT_SECRET` | JWT signing secret | `change-me` |
| `LOG_LEVEL` | Logging level | `info` |

## 📚 API Documentation

### Core Endpoints

#### Authentication
```
POST /auth/login          # User login
POST /auth/logout         # User logout
GET  /auth/me            # Get current user
```

#### Services
```
GET    /api/services      # List all services
POST   /api/services      # Create new service
GET    /api/services/:id  # Get service details
PUT    /api/services/:id  # Update service
DELETE /api/services/:id  # Delete service
```

#### Deployments
```
GET    /api/deployments   # List deployments
POST   /api/deployments   # Create deployment
GET    /api/deployments/:id # Get deployment status
```

#### Pipelines
```
GET    /api/pipelines     # List pipelines
POST   /api/pipelines     # Create pipeline
POST   /api/pipelines/:id/run # Trigger pipeline
```

## 🔧 Configuration

### Service Configuration
Each service can be configured via environment variables or configuration files:

```yaml
# config/service.yml
server:
  port: 8080
  host: 0.0.0.0

database:
  url: ${DATABASE_URL}
  pool:
    min: 2
    max: 10

redis:
  url: ${REDIS_URL}
  ttl: 3600

logging:
  level: ${LOG_LEVEL}
  format: json
```

### GitOps Configuration
```yaml
# gitops/config.yml
repositories:
  - name: infrastructure
    url: https://github.com/org/infrastructure
    branch: main
    path: k8s/

templates:
  - name: microservice
    path: templates/microservice/
    variables:
      - name
      - port
      - replicas
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Load Testing
```bash
# Install k6
brew install k6

# Run load tests
k6 run tests/load/api-test.js
```

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check service logs
docker-compose logs <service-name>

# Check resource usage
docker stats

# Restart specific service
docker-compose restart <service-name>
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# Connect to database
docker-compose exec postgres psql -U idp_user -d idp_db

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Frontend Build Issues
```bash
# Clear node modules
rm -rf frontend/node_modules
cd frontend && npm install

# Clear build cache
npm run clean
npm run build
```

### Performance Tuning

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### Memory Usage
```bash
# Monitor memory usage
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Adjust container limits
# Edit docker-compose.yml memory limits
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

### Commit Convention
```
feat: add new service catalog feature
fix: resolve authentication bug
docs: update API documentation
test: add integration tests
refactor: improve error handling
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@shadowidp.com

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core platform architecture
- ✅ Basic authentication and authorization
- ✅ Service catalog foundation
- ✅ Observability stack integration

### Phase 2 (Next)
- 🔄 Advanced CI/CD pipeline features
- 🔄 Enhanced GitOps workflows
- 🔄 Advanced alerting and notification system
- 🔄 Team management and RBAC

### Phase 3 (Future)
- 📋 Multi-cloud deployment support
- 📋 Advanced security scanning
- 📋 Cost optimization features
- 📋 AI-powered insights and recommendations

---

**Shadow IDP** - Empowering developers with a comprehensive platform for modern application development and operations. 🚀

