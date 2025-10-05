# Shadow IDP - Service Catalog

A comprehensive service catalog for the Shadow Internal Developer Platform (IDP) that provides service discovery, management, templates, dependency tracking, and observability.

## 🚀 Features

### Core Service Management
- **Service Registry**: Complete CRUD operations for services
- **Service Discovery**: Search and filter services by various criteria
- **Service Metadata**: Rich metadata including owner, team, version, tags
- **Health Monitoring**: Service health checks and status tracking
- **Lifecycle Management**: Track services through development stages

### Service Templates
- **Template Library**: Pre-built templates for common service types
- **Template Engine**: Create services from templates with validation
- **Custom Templates**: Define organization-specific service templates
- **Template Categories**: API, Web Service, Database, Message Queue, Cache, etc.

### Dependency Management
- **Dependency Tracking**: Map service dependencies and relationships
- **Dependency Graph**: Visualize service interconnections
- **Circular Dependency Detection**: Prevent invalid dependency chains
- **Impact Analysis**: Understand downstream effects of service changes

### Metrics & Observability
- **Performance Metrics**: Track availability, response time, error rates
- **SLA Monitoring**: Define and monitor service level agreements
- **Analytics Dashboard**: Visualize service health and performance trends
- **Historical Data**: Store and analyze metrics over time

### Enhanced Features
- **Service Types**: Categorize services (API, Database, Cache, etc.)
- **Lifecycle Stages**: Planning, Development, Testing, Production, etc.
- **Contact Management**: Owner, maintainers, on-call information
- **Incident Tracking**: Link incidents to services
- **Custom Metadata**: Flexible key-value metadata storage

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Charts**: Chart.js for data visualization
- **Containerization**: Docker

### API Structure
```
/api/services          - Service CRUD operations
/api/templates         - Service template management
/api/dependencies      - Dependency management
/api/metrics          - Metrics collection and analytics
```

### Database Schema
- **services**: Core service information
- **service_templates**: Reusable service templates
- **service_dependencies**: Service relationship mapping
- **service_metrics**: Performance and health metrics
- **service_incidents**: Incident tracking
- **health_checks**: Health check results

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+ database
- Git
- Docker (for containerized deployment)
- Kubernetes cluster (for production deployment)

### Local Development

1. **Clone and navigate to the service catalog**:
```bash
cd service-catalog
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your database configuration
```

4. **Start the database** (if using Docker):
```bash
docker run --name postgres-catalog \
  -e POSTGRES_DB=service_catalog \
  -e POSTGRES_USER=catalog_user \
  -e POSTGRES_PASSWORD=catalog_pass \
  -p 5432:5432 -d postgres:14
```

5. **Run database migrations**:
```bash
npm run migrate
```

6. **Start the development server**:
```bash
npm run dev
```

7. **Access the dashboard**:
Open http://localhost:8081 in your browser

### 🐳 Docker Deployment

1. **Build the Docker image**:
```bash
docker build -t shadow-idp/service-catalog:latest .
```

2. **Run with Docker Compose**:
```bash
docker-compose up -d
```

### ☸️ Kubernetes Deployment

For production deployment on Kubernetes:

1. **Quick deployment**:
```bash
# Configure environment
export DB_PASSWORD="your-secure-password"
export DOMAIN="service-catalog.your-domain.com"

# Deploy
./scripts/deploy.sh
```

2. **Manual deployment**:
```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/
```

3. **Access the service**:
```bash
kubectl port-forward service/service-catalog-service 8080:80 -n shadow-idp
# Open http://localhost:8080
```

📖 **For detailed Kubernetes deployment instructions, see [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md)**

## 📊 Dashboard Features

### Service Overview
- **Service List**: Searchable and filterable service inventory
- **Health Status**: Real-time service health indicators
- **Service Types**: Visual categorization of services
- **Quick Actions**: Create, edit, delete services

### Template Management
- **Template Gallery**: Browse available service templates
- **Template Creation**: Build custom templates for your organization
- **One-Click Deployment**: Create services from templates instantly

### Dependency Visualization
- **Dependency Graph**: Interactive service relationship mapping
- **Impact Analysis**: Understand service interdependencies
- **Circular Detection**: Prevent invalid dependency chains

### Metrics Dashboard
- **Health Overview**: Service health distribution charts
- **Performance Trends**: Response time and throughput analytics
- **SLA Monitoring**: Track service level agreement compliance
- **Historical Analysis**: Time-series performance data

## 🔧 API Documentation

### Services API

#### Get All Services
```http
GET /api/services?query=search&owner=team&status=healthy&limit=20&offset=0
```

#### Create Service
```http
POST /api/services
Content-Type: application/json

{
  "name": "user-api",
  "description": "User management API service",
  "version": "1.0.0",
  "owner": "john.doe",
  "team": "backend-team",
  "serviceType": "api",
  "lifecycle": "production",
  "repositoryUrl": "https://github.com/org/user-api",
  "healthEndpoint": "https://user-api.example.com/health",
  "tags": ["api", "users", "authentication"],
  "deploymentInfo": {
    "environment": "production",
    "namespace": "apis",
    "replicas": 3,
    "resources": {
      "cpu": "500m",
      "memory": "512Mi"
    }
  },
  "sla": {
    "availability": 99.9,
    "responseTime": 200,
    "errorRate": 1.0
  },
  "contacts": {
    "owner": "john.doe",
    "maintainers": ["jane.smith", "bob.wilson"],
    "slack": "#backend-team"
  }
}
```

### Templates API

#### Get All Templates
```http
GET /api/templates?serviceType=api
```

#### Create Service from Template
```http
POST /api/templates/{templateId}/create-service
Content-Type: application/json

{
  "name": "new-service",
  "description": "Service created from template",
  "owner": "developer",
  "team": "my-team"
}
```

### Dependencies API

#### Get Dependency Graph
```http
GET /api/dependencies/graph?depth=3
```

#### Create Dependency
```http
POST /api/dependencies
Content-Type: application/json

{
  "serviceId": "service-uuid",
  "dependsOnServiceId": "dependency-uuid",
  "dependencyType": "runtime",
  "isRequired": true,
  "description": "Database dependency"
}
```

### Metrics API

#### Record Metrics
```http
POST /api/metrics/services/{serviceId}
Content-Type: application/json

{
  "availability": 99.5,
  "responseTime": 150,
  "errorRate": 0.5,
  "throughput": 1000,
  "cpuUsage": 45.2,
  "memoryUsage": 67.8
}
```

#### Get Service Analytics
```http
GET /api/metrics/services/{serviceId}/analytics?period=24h
```

## 🎯 Service Types

The catalog supports various service types:

- **API**: REST/GraphQL APIs and microservices
- **Web Service**: Frontend applications and web services
- **Database**: SQL/NoSQL databases and data stores
- **Message Queue**: Messaging systems (RabbitMQ, Kafka, etc.)
- **Cache**: Caching layers (Redis, Memcached, etc.)
- **Storage**: File storage and object storage services
- **Monitoring**: Observability and monitoring tools
- **Security**: Authentication and authorization services
- **Infrastructure**: Core infrastructure components
- **Library**: Shared libraries and packages
- **Tool**: Development and operational tools

## 📈 Metrics Collection

### Supported Metrics
- **Availability**: Service uptime percentage
- **Response Time**: Average response time in milliseconds
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **Resource Usage**: CPU, memory, and disk utilization

### Collection Methods
- **Push Metrics**: Services push metrics via API
- **Health Checks**: Automated health endpoint polling
- **External Integration**: Prometheus, Grafana, etc.

## 🔄 Lifecycle Management

Services progress through defined lifecycle stages:

1. **Planning**: Service is being planned
2. **Development**: Active development phase
3. **Testing**: Quality assurance and testing
4. **Staging**: Pre-production validation
5. **Production**: Live production service
6. **Deprecated**: Marked for retirement
7. **Retired**: No longer in use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is part of the Shadow IDP platform and follows the same licensing terms.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the platform team
- Check the documentation wiki

---

**Shadow IDP Service Catalog** - Comprehensive service management for modern development teams.
