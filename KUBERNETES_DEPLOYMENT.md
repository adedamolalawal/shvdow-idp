# Shadow IDP - Complete Platform Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the complete Shadow IDP platform to a Kubernetes cluster with production-ready configurations.

## 🏗️ Platform Overview

The Shadow IDP platform consists of the following components:

### Core Services
- **API Gateway** - Central API routing and authentication
- **Service Catalog** - Service discovery and metadata management
- **CI/CD Engine** - Automated build, test, and deployment workflows
- **Alert Engine** - Intelligent alerting and notification system
- **Docs Engine** - Documentation generation and management
- **Metrics Collector** - Metrics aggregation and processing
- **Team Management** - User and team management with RBAC
- **GitOps Core** - Git-driven configuration management

### Infrastructure Components
- **PostgreSQL** - Primary database for all services
- **Redis** - Caching and session storage
- **Prometheus** - Metrics collection and monitoring
- **Grafana** - Visualization and dashboards
- **Jaeger** - Distributed tracing

## 📋 Prerequisites

### Required Tools
- **kubectl** (v1.20+) - Kubernetes command-line tool
- **Docker** (v20.10+) - For building container images
- **openssl** - For generating secrets
- **curl** - For health checks and testing

### Kubernetes Cluster Requirements
- **Kubernetes version**: 1.20 or higher
- **NGINX Ingress Controller** - For external access
- **cert-manager** - For TLS certificate management (optional)
- **Metrics Server** - For HPA functionality
- **Persistent Volume support** - For database storage

### Resource Requirements
- **Minimum**: 8 CPU cores, 16GB RAM, 200GB storage
- **Recommended**: 16 CPU cores, 32GB RAM, 500GB storage
- **Storage Class**: `standard` or equivalent for persistent volumes

## 🚀 Quick Start Deployment

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd shadow-idp
```

### 2. Configure Environment Variables
```bash
# Database credentials (auto-generated if not set)
export DB_PASSWORD="your-secure-database-password"
export POSTGRES_PASSWORD="your-postgresql-password"
export JWT_SECRET="your-jwt-secret"
export REDIS_PASSWORD="your-redis-password"

# Domain configuration
export DOMAIN="shadow-idp.your-domain.com"

# Container registry (optional)
export REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"
```

### 3. Deploy the Complete Platform
```bash
# Make the deployment script executable
chmod +x scripts/deploy-platform.sh

# Full deployment with image build
./scripts/deploy-platform.sh

# Skip image build (use existing images)
./scripts/deploy-platform.sh --skip-build

# Custom domain and registry
./scripts/deploy-platform.sh --domain shadow-idp.company.com --registry gcr.io/your-project

# Dry run to see what would be deployed
./scripts/deploy-platform.sh --dry-run
```

### 4. Verify Deployment
```bash
# Check deployment status
kubectl get all -n shadow-idp

# Check ingress
kubectl get ingress -n shadow-idp

# Access via port-forward (for testing)
kubectl port-forward service/api-gateway-service 8080:80 -n shadow-idp
# Open http://localhost:8080
```

## 🛠️ Manual Deployment Steps

### Step 1: Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace shadow-idp
kubectl label namespace shadow-idp name=shadow-idp
kubectl label namespace shadow-idp app.kubernetes.io/name=shadow-idp

# Create secrets
kubectl create secret generic shadow-idp-db-secrets \
  --from-literal=DB_PASSWORD="your-secure-password" \
  --from-literal=POSTGRES_PASSWORD="your-postgresql-password" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
  --namespace=shadow-idp
```

### Step 2: Deploy Infrastructure Components

```bash
# Deploy PostgreSQL
kubectl apply -f k8s/infrastructure/postgresql.yaml -n shadow-idp

# Deploy Redis
kubectl apply -f k8s/infrastructure/redis.yaml -n shadow-idp

# Deploy Prometheus
kubectl apply -f k8s/monitoring/prometheus.yaml -n shadow-idp

# Wait for infrastructure to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgresql -n shadow-idp
kubectl wait --for=condition=available --timeout=300s deployment/redis -n shadow-idp
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n shadow-idp
```

### Step 3: Deploy Application Services

```bash
# Deploy Service Catalog (already has complete k8s manifests)
kubectl apply -f service-catalog/k8s/ -n shadow-idp

# Deploy other services (using existing k8s manifests)
kubectl apply -f k8s/deployments/ -n shadow-idp
kubectl apply -f k8s/services/ -n shadow-idp
kubectl apply -f k8s/configmaps/ -n shadow-idp
kubectl apply -f k8s/rbac/ -n shadow-idp
```

### Step 4: Configure Ingress

```bash
# Update domain in ingress manifest
export DOMAIN="your-domain.com"
sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" k8s/ingress/shadow-idp-ingress.yaml | kubectl apply -f - -n shadow-idp
```

### Step 5: Verify All Components

```bash
# Check all resources
kubectl get all -n shadow-idp

# Check ingress
kubectl get ingress -n shadow-idp

# View logs for any component
kubectl logs -f deployment/service-catalog -n shadow-idp

# Run health checks
kubectl get pods -n shadow-idp | grep -v Running
```

## 🔧 Configuration Options

### Deployment Script Options

The `deploy-platform.sh` script supports various configuration options:

```bash
# Show help
./scripts/deploy-platform.sh --help

# Available options:
--namespace NAMESPACE       # Kubernetes namespace (default: shadow-idp)
--registry REGISTRY         # Container registry (default: shadow-idp)
--image-tag TAG            # Image tag (default: latest)
--domain DOMAIN            # Base domain (default: shadow-idp.local)
--skip-build               # Skip building container images
--skip-tests               # Skip running tests
--dry-run                  # Show what would be deployed without applying
--verbose                  # Enable verbose output
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NAMESPACE` | Kubernetes namespace | `shadow-idp` |
| `REGISTRY` | Container registry | `shadow-idp` |
| `IMAGE_TAG` | Image tag | `latest` |
| `DOMAIN` | Base domain | `shadow-idp.local` |
| `DB_PASSWORD` | Database password | Auto-generated |
| `POSTGRES_PASSWORD` | PostgreSQL password | Auto-generated |
| `JWT_SECRET` | JWT signing secret | Auto-generated |
| `REDIS_PASSWORD` | Redis password | Auto-generated |

### Component Configuration

Each service can be configured through ConfigMaps and environment variables:

```bash
# View service configuration
kubectl get configmap -n shadow-idp

# Edit service configuration
kubectl edit configmap service-catalog-config -n shadow-idp

# Restart service to pick up changes
kubectl rollout restart deployment/service-catalog -n shadow-idp
```

## 🌐 Access URLs

After deployment, the platform will be accessible at:

### Public URLs
- **Main Dashboard**: `https://your-domain.com`
- **API Gateway**: `https://api.your-domain.com`
- **Service Catalog**: `https://catalog.your-domain.com`
- **Documentation**: `https://docs.your-domain.com`
- **Alerts Dashboard**: `https://alerts.your-domain.com`

### Monitoring URLs
- **Grafana**: `https://grafana.your-domain.com`
- **Prometheus**: `https://prometheus.your-domain.com`

### Internal URLs (with authentication)
- **Internal Dashboard**: `https://internal.your-domain.com`
- **Jaeger Tracing**: `https://jaeger.your-domain.com`

## 🔒 Security Configuration

### RBAC Permissions

Each service runs with minimal required permissions:
- Read access to services, pods, deployments for service discovery
- Limited access to secrets and configmaps in the namespace
- No cluster-wide permissions unless specifically required

### Security Context

All containers run with security hardening:
- Non-root user
- Read-only root filesystem where possible
- No privilege escalation
- Dropped capabilities

### Network Policies

Network policies restrict traffic between components:

```bash
# View network policies
kubectl get networkpolicy -n shadow-idp

# Apply additional network restrictions
kubectl apply -f k8s/network-policies/ -n shadow-idp
```

## 📊 Monitoring and Observability

### Prometheus Metrics

All services expose metrics at `/metrics` endpoint:
- HTTP request metrics
- Database connection metrics
- Custom business metrics
- Runtime metrics

### Health Checks

Health endpoints for all services:
- `/health` - Basic health check
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

### Grafana Dashboards

Pre-configured dashboards for:
- Platform overview
- Service-specific metrics
- Infrastructure monitoring
- Alert management

### Distributed Tracing

Jaeger provides distributed tracing across all services:
- Request flow visualization
- Performance bottleneck identification
- Error tracking and debugging

## 🔄 Scaling and Performance

### Horizontal Scaling

Scale individual services:
```bash
# Manual scaling
kubectl scale deployment service-catalog --replicas=5 -n shadow-idp

# Auto-scaling is configured via HPA
kubectl get hpa -n shadow-idp
```

### Vertical Scaling

Update resource limits:
```bash
kubectl patch deployment service-catalog -n shadow-idp -p '{"spec":{"template":{"spec":{"containers":[{"name":"service-catalog","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'
```

### Database Scaling

For production workloads:
- PostgreSQL clustering (Patroni, Stolon)
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)

## 🔧 Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**:
   ```bash
   kubectl logs deployment/service-name -n shadow-idp
   kubectl describe pod pod-name -n shadow-idp
   ```

2. **Database Connection Issues**:
   ```bash
   kubectl exec -it deployment/service-name -n shadow-idp -- nc -zv postgresql-service 5432
   ```

3. **Ingress Not Working**:
   ```bash
   kubectl get ingress -n shadow-idp
   kubectl describe ingress shadow-idp-ingress -n shadow-idp
   ```

4. **Service Discovery Issues**:
   ```bash
   kubectl get endpoints -n shadow-idp
   kubectl get services -n shadow-idp
   ```

### Debug Commands

```bash
# Get all resources
kubectl get all -n shadow-idp

# Check events
kubectl get events -n shadow-idp --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n shadow-idp

# Access pod shell
kubectl exec -it deployment/service-name -n shadow-idp -- /bin/sh

# View detailed pod information
kubectl describe pod pod-name -n shadow-idp

# Check service connectivity
kubectl exec -it deployment/service-catalog -n shadow-idp -- curl http://api-gateway-service/health
```

## 🔄 Updates and Maintenance

### Rolling Updates

Update service images:
```bash
kubectl set image deployment/service-catalog service-catalog=shadow-idp/service-catalog:v2.0.0 -n shadow-idp
```

Monitor rollout:
```bash
kubectl rollout status deployment/service-catalog -n shadow-idp
```

Rollback if needed:
```bash
kubectl rollout undo deployment/service-catalog -n shadow-idp
```

### Configuration Updates

Update ConfigMaps:
```bash
kubectl patch configmap service-catalog-config -n shadow-idp --patch '{"data":{"LOG_LEVEL":"debug"}}'
```

Restart deployments to pick up changes:
```bash
kubectl rollout restart deployment/service-catalog -n shadow-idp
```

### Platform Updates

Use the deployment script for updates:
```bash
# Update with new image tag
./scripts/deploy-platform.sh --image-tag v2.0.0 --skip-tests

# Update specific components
kubectl apply -f service-catalog/k8s/ -n shadow-idp
```

## 🗂️ Backup and Recovery

### Database Backup

Automated backup with CronJob:
```bash
kubectl apply -f k8s/backup/postgresql-backup.yaml -n shadow-idp
```

Manual backup:
```bash
kubectl exec -it deployment/postgresql -n shadow-idp -- pg_dump -U shadow_idp shadow_idp > backup.sql
```

### Configuration Backup

Backup all configurations:
```bash
kubectl get all,configmap,secret,ingress,pvc -n shadow-idp -o yaml > shadow-idp-backup.yaml
```

### Disaster Recovery

1. **Restore Database**:
   ```bash
   kubectl exec -it deployment/postgresql -n shadow-idp -- psql -U shadow_idp -d shadow_idp < backup.sql
   ```

2. **Restore Configuration**:
   ```bash
   kubectl apply -f shadow-idp-backup.yaml
   ```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)

## 🆘 Support

For deployment issues:

1. **Check Prerequisites**: Ensure all required tools and cluster requirements are met
2. **Review Logs**: Check application and Kubernetes logs for errors
3. **Verify Resources**: Ensure sufficient cluster resources are available
4. **Check Network**: Verify ingress controller and DNS configuration
5. **Validate Configuration**: Ensure all secrets and configmaps are properly set

### Useful Commands for Support

```bash
# Platform health overview
kubectl get pods,services,ingress -n shadow-idp

# Check resource usage
kubectl top nodes
kubectl top pods -n shadow-idp

# View recent events
kubectl get events -n shadow-idp --sort-by='.lastTimestamp' | tail -20

# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify DNS resolution
kubectl exec -it deployment/service-catalog -n shadow-idp -- nslookup api-gateway-service
```

---

This deployment guide provides a complete production-ready setup for the Shadow IDP platform on Kubernetes with enterprise-grade security, monitoring, and scalability features.

## 🎯 Next Steps

After successful deployment:

1. **Configure Authentication**: Set up OAuth/OIDC integration
2. **Import Services**: Begin cataloging your existing services
3. **Set Up Monitoring**: Configure alerts and dashboards
4. **Team Onboarding**: Add teams and configure RBAC
5. **CI/CD Integration**: Connect your existing CI/CD pipelines
6. **Documentation**: Start building your service documentation

The Shadow IDP platform is now ready to accelerate your development workflows! 🚀
