# Shadow IDP Service Catalog - Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Shadow IDP Service Catalog to a Kubernetes cluster with production-ready configurations.

## 📋 Prerequisites

### Required Tools
- **kubectl** (v1.20+) - Kubernetes command-line tool
- **Docker** (v20.10+) - For building container images
- **kustomize** (v4.0+) - Optional, for advanced configuration management
- **curl** - For health checks and testing

### Kubernetes Cluster Requirements
- **Kubernetes version**: 1.20 or higher
- **NGINX Ingress Controller** - For external access
- **cert-manager** - For TLS certificate management (optional)
- **Metrics Server** - For HPA functionality
- **Persistent Volume support** - For PostgreSQL data storage

### Resource Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB storage
- **Storage Class**: `standard` or equivalent for persistent volumes

## 🚀 Quick Start Deployment

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd service-catalog
```

### 2. Configure Environment Variables
```bash
# Database credentials
export DB_PASSWORD="your-secure-database-password"
export POSTGRES_PASSWORD="your-postgresql-password"

# Optional: Custom domain
export DOMAIN="service-catalog.your-domain.com"

# Optional: Container registry
export REGISTRY="your-registry.com"
export IMAGE_TAG="v1.0.0"
```

### 3. Deploy with Script
```bash
# Full deployment with image build
./scripts/deploy.sh

# Skip image build (use existing image)
./scripts/deploy.sh --skip-build

# Custom domain and registry
./scripts/deploy.sh --domain service-catalog.example.com --registry gcr.io/your-project
```

### 4. Verify Deployment
```bash
# Check deployment status
kubectl get all -n shadow-idp

# Access via port-forward
kubectl port-forward service/service-catalog-service 8080:80 -n shadow-idp
# Open http://localhost:8080
```

## 🛠️ Manual Deployment Steps

### Step 1: Build and Push Container Image

```bash
# Build the image
docker build -t shadow-idp/service-catalog:latest .

# Tag for registry (if using external registry)
docker tag shadow-idp/service-catalog:latest your-registry.com/shadow-idp/service-catalog:latest

# Push to registry
docker push your-registry.com/shadow-idp/service-catalog:latest
```

### Step 2: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 3: Configure Secrets

Update the secrets with your actual values:

```bash
# Create database secrets
kubectl create secret generic service-catalog-secrets \
  --from-literal=DB_USER=service_catalog \
  --from-literal=DB_PASSWORD=your-secure-password \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --namespace=shadow-idp

kubectl create secret generic postgresql-secret \
  --from-literal=POSTGRES_DB=service_catalog \
  --from-literal=POSTGRES_USER=service_catalog \
  --from-literal=POSTGRES_PASSWORD=your-postgresql-password \
  --namespace=shadow-idp
```

Or apply the secret files (after updating base64 values):
```bash
kubectl apply -f k8s/secret.yaml
```

### Step 4: Deploy Database

```bash
kubectl apply -f k8s/postgresql.yaml
```

Wait for PostgreSQL to be ready:
```bash
kubectl wait --for=condition=available --timeout=300s deployment/postgresql -n shadow-idp
```

### Step 5: Deploy Application

```bash
# Apply RBAC
kubectl apply -f k8s/rbac.yaml

# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Configure autoscaling
kubectl apply -f k8s/hpa.yaml
```

### Step 6: Configure Ingress

Update the domain in `k8s/ingress.yaml`:
```yaml
spec:
  rules:
  - host: service-catalog.your-domain.com  # Update this
```

Then apply:
```bash
kubectl apply -f k8s/ingress.yaml
```

### Step 7: Verify Deployment

```bash
# Check all resources
kubectl get all -n shadow-idp

# Check ingress
kubectl get ingress -n shadow-idp

# View logs
kubectl logs -f deployment/service-catalog -n shadow-idp

# Test health endpoint
kubectl port-forward service/service-catalog-service 8080:80 -n shadow-idp &
curl http://localhost:8080/health
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Application port | `8081` |
| `LOG_LEVEL` | Logging level | `info` |
| `DB_HOST` | Database host | `postgresql-service.shadow-idp.svc.cluster.local` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `service_catalog` |
| `DB_USER` | Database user | From secret |
| `DB_PASSWORD` | Database password | From secret |
| `JWT_SECRET` | JWT signing secret | From secret |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `ENABLE_METRICS` | Enable metrics collection | `true` |
| `ENABLE_TEMPLATES` | Enable service templates | `true` |
| `ENABLE_DEPENDENCIES` | Enable dependency tracking | `true` |
| `ENABLE_DASHBOARD` | Enable web dashboard | `true` |

### Resource Limits

Default resource configuration:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling Configuration

Horizontal Pod Autoscaler settings:

```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

## 🔒 Security Configuration

### RBAC Permissions

The service account has minimal required permissions:
- Read access to services, pods, deployments for service discovery
- Read access to ingresses for URL detection
- Limited access to secrets and configmaps in the namespace

### Security Context

Containers run with security hardening:
- Non-root user (UID 1000)
- Read-only root filesystem
- No privilege escalation
- Dropped capabilities

### Network Policies

Consider implementing network policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: service-catalog-netpol
  namespace: shadow-idp
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: service-catalog
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8081
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: postgresql
    ports:
    - protocol: TCP
      port: 5432
```

## 📊 Monitoring and Observability

### Prometheus Metrics

The service exposes metrics at `/metrics` endpoint:
- HTTP request metrics
- Database connection metrics
- Custom business metrics
- Node.js runtime metrics

### Health Checks

Health endpoints:
- `/health` - Basic health check
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

### Logging

Structured JSON logging with configurable levels:
- `error` - Error messages only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information

## 🔄 Backup and Recovery

### Database Backup

Create a backup job:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: shadow-idp
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:14-alpine
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgresql-service -U $POSTGRES_USER -d $POSTGRES_DB > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
            env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: POSTGRES_DB
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### Disaster Recovery

1. **Database Recovery**:
   ```bash
   kubectl exec -it postgresql-pod -n shadow-idp -- psql -U service_catalog -d service_catalog < backup.sql
   ```

2. **Configuration Recovery**:
   ```bash
   kubectl apply -f k8s/
   ```

## 🚀 Scaling and Performance

### Horizontal Scaling

Scale the deployment:
```bash
# Manual scaling
kubectl scale deployment service-catalog --replicas=5 -n shadow-idp

# Auto-scaling is configured via HPA
kubectl get hpa -n shadow-idp
```

### Vertical Scaling

Update resource limits:
```bash
kubectl patch deployment service-catalog -n shadow-idp -p '{"spec":{"template":{"spec":{"containers":[{"name":"service-catalog","resources":{"limits":{"memory":"1Gi","cpu":"1000m"}}}]}}}}'
```

### Database Scaling

For production workloads, consider:
- PostgreSQL clustering (e.g., Patroni, Stolon)
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)

## 🔧 Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**:
   ```bash
   kubectl logs deployment/service-catalog -n shadow-idp
   kubectl describe pod <pod-name> -n shadow-idp
   ```

2. **Database Connection Issues**:
   ```bash
   kubectl exec -it deployment/service-catalog -n shadow-idp -- nc -zv postgresql-service 5432
   ```

3. **Ingress Not Working**:
   ```bash
   kubectl get ingress -n shadow-idp
   kubectl describe ingress service-catalog-ingress -n shadow-idp
   ```

4. **Health Check Failures**:
   ```bash
   kubectl port-forward service/service-catalog-service 8080:80 -n shadow-idp
   curl -v http://localhost:8080/health
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
kubectl exec -it deployment/service-catalog -n shadow-idp -- /bin/sh

# View detailed pod information
kubectl describe pod <pod-name> -n shadow-idp
```

## 🔄 Updates and Maintenance

### Rolling Updates

Update the image:
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

Update ConfigMap:
```bash
kubectl patch configmap service-catalog-config -n shadow-idp --patch '{"data":{"LOG_LEVEL":"debug"}}'
```

Restart deployment to pick up changes:
```bash
kubectl rollout restart deployment/service-catalog -n shadow-idp
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [PostgreSQL on Kubernetes](https://postgres-operator.readthedocs.io/)

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs: `kubectl logs -f deployment/service-catalog -n shadow-idp`
3. Check Kubernetes events: `kubectl get events -n shadow-idp`
4. Verify resource availability: `kubectl describe nodes`

---

This deployment guide provides a production-ready setup for the Shadow IDP Service Catalog on Kubernetes with comprehensive monitoring, security, and scalability features.
