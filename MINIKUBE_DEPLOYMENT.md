# Shadow IDP - Local Minikube Deployment Guide

This guide provides step-by-step instructions for building and running the complete Shadow IDP platform on your local Minikube cluster.

## 🏠 Local Development Setup

### Prerequisites

#### Required Tools
- **Minikube** (v1.25+) - Already installed ✅
- **kubectl** - Kubernetes command-line tool
- **Docker** - For building container images
- **Node.js 18+** - For building the applications
- **Git** - For cloning the repository

#### Minikube Configuration
```bash
# Check Minikube status
minikube status

# Start Minikube with sufficient resources
minikube start --cpus=4 --memory=8192 --disk-size=50g

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner
```

## 🚀 Quick Local Deployment

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd shadow-idp

# Configure Docker to use Minikube's Docker daemon
eval $(minikube docker-env)
```

### 2. Build All Images Locally
```bash
# Build all component images using Minikube's Docker
./scripts/deploy-platform.sh --registry=local --skip-tests --domain=shadow-idp.local

# Or build individual components
docker build -t local/service-catalog:latest service-catalog/
docker build -t local/api-gateway:latest api-gateway/
# ... etc for other services
```

### 3. Deploy to Minikube
```bash
# Deploy with local registry and domain
./scripts/deploy-platform.sh \
  --registry=local \
  --domain=shadow-idp.local \
  --skip-build \
  --namespace=shadow-idp
```

### 4. Access the Platform
```bash
# Get Minikube IP
minikube ip

# Add entries to /etc/hosts (or use minikube tunnel)
echo "$(minikube ip) shadow-idp.local" | sudo tee -a /etc/hosts
echo "$(minikube ip) api.shadow-idp.local" | sudo tee -a /etc/hosts
echo "$(minikube ip) catalog.shadow-idp.local" | sudo tee -a /etc/hosts
echo "$(minikube ip) grafana.shadow-idp.local" | sudo tee -a /etc/hosts
echo "$(minikube ip) prometheus.shadow-idp.local" | sudo tee -a /etc/hosts

# Or use minikube tunnel (in separate terminal)
minikube tunnel
```

## 🛠️ Step-by-Step Local Build Process

### Step 1: Prepare Minikube Environment
```bash
# Ensure Minikube is running with sufficient resources
minikube start --cpus=4 --memory=8192 --disk-size=50g

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server

# Configure Docker environment
eval $(minikube docker-env)

# Verify Docker is using Minikube
docker ps  # Should show Minikube containers
```

### Step 2: Build Service Catalog
```bash
cd service-catalog

# Install dependencies
npm install

# Run tests (optional)
npm test

# Build Docker image
docker build -t local/service-catalog:latest .

# Verify image
docker images | grep service-catalog
```

### Step 3: Build API Gateway
```bash
cd ../api-gateway

# Install dependencies
npm install

# Build Docker image
docker build -t local/api-gateway:latest .
```

### Step 4: Build Other Services
```bash
# For each service in the services/ directory
for service in cicd-engine alert-engine docs-engine metrics-collector team-management gitops-core; do
  cd "../services/$service"
  if [ -f "package.json" ]; then
    npm install
    docker build -t "local/$service:latest" .
  fi
done
```

### Step 5: Deploy Infrastructure
```bash
# Return to root directory
cd ../..

# Create namespace
kubectl create namespace shadow-idp

# Deploy infrastructure components
kubectl apply -f k8s/infrastructure/ -n shadow-idp

# Wait for infrastructure to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgresql -n shadow-idp
kubectl wait --for=condition=available --timeout=300s deployment/redis -n shadow-idp
```

### Step 6: Deploy Applications
```bash
# Update image references for local registry
sed -i 's/shadow-idp\//local\//g' service-catalog/k8s/deployment.yaml
sed -i 's/shadow-idp\//local\//g' k8s/deployments/*.yaml

# Deploy Service Catalog
kubectl apply -f service-catalog/k8s/ -n shadow-idp

# Deploy other services
kubectl apply -f k8s/deployments/ -n shadow-idp
kubectl apply -f k8s/services/ -n shadow-idp
kubectl apply -f k8s/configmaps/ -n shadow-idp
```

### Step 7: Configure Ingress
```bash
# Update ingress with local domain
sed 's/DOMAIN_PLACEHOLDER/shadow-idp.local/g' k8s/ingress/shadow-idp-ingress.yaml | kubectl apply -f - -n shadow-idp
```

## 🔧 Minikube-Specific Configuration

### Resource Adjustments for Local Development
```yaml
# Reduce resource requirements for local development
# Edit deployments to use smaller resource limits:

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "250m"
```

### Storage Configuration
```bash
# Minikube uses hostPath storage by default
# Verify storage class
kubectl get storageclass

# If needed, create PVs manually
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgresql-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data/postgresql
  storageClassName: standard
EOF
```

## 🌐 Local Access Methods

### Method 1: /etc/hosts + Minikube IP
```bash
# Get Minikube IP
MINIKUBE_IP=$(minikube ip)

# Add to /etc/hosts
sudo tee -a /etc/hosts <<EOF
$MINIKUBE_IP shadow-idp.local
$MINIKUBE_IP api.shadow-idp.local
$MINIKUBE_IP catalog.shadow-idp.local
$MINIKUBE_IP grafana.shadow-idp.local
$MINIKUBE_IP prometheus.shadow-idp.local
EOF

# Access via browser
open http://shadow-idp.local
open http://catalog.shadow-idp.local
```

### Method 2: Minikube Tunnel (Recommended)
```bash
# Start tunnel (run in separate terminal)
minikube tunnel

# Access via localhost
open http://shadow-idp.local
open http://api.shadow-idp.local
open http://catalog.shadow-idp.local
```

### Method 3: Port Forwarding
```bash
# Forward individual services
kubectl port-forward service/service-catalog-service 8081:80 -n shadow-idp
kubectl port-forward service/api-gateway-service 8080:80 -n shadow-idp
kubectl port-forward service/prometheus-service 9090:9090 -n shadow-idp

# Access via localhost
open http://localhost:8081  # Service Catalog
open http://localhost:8080  # API Gateway
open http://localhost:9090  # Prometheus
```

## 🐳 Local Development Workflow

### Development Loop
```bash
# 1. Make code changes
vim service-catalog/src/app.js

# 2. Rebuild image
cd service-catalog
docker build -t local/service-catalog:latest .

# 3. Restart deployment
kubectl rollout restart deployment/service-catalog -n shadow-idp

# 4. Check logs
kubectl logs -f deployment/service-catalog -n shadow-idp

# 5. Test changes
curl http://catalog.shadow-idp.local/health
```

### Hot Reload Development (Optional)
```bash
# For active development, mount source code
kubectl patch deployment service-catalog -n shadow-idp -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "service-catalog",
            "volumeMounts": [
              {
                "name": "source-code",
                "mountPath": "/app/src"
              }
            ]
          }
        ],
        "volumes": [
          {
            "name": "source-code",
            "hostPath": {
              "path": "/path/to/your/service-catalog/src"
            }
          }
        ]
      }
    }
  }
}'
```

## 🔍 Monitoring and Debugging

### Check Deployment Status
```bash
# Overview of all resources
kubectl get all -n shadow-idp

# Check pod status
kubectl get pods -n shadow-idp

# Check services
kubectl get services -n shadow-idp

# Check ingress
kubectl get ingress -n shadow-idp
```

### Debug Common Issues
```bash
# Pod not starting
kubectl describe pod <pod-name> -n shadow-idp
kubectl logs <pod-name> -n shadow-idp

# Service not accessible
kubectl describe service <service-name> -n shadow-idp
kubectl get endpoints -n shadow-idp

# Ingress issues
kubectl describe ingress shadow-idp-ingress -n shadow-idp
kubectl get events -n shadow-idp
```

### Resource Usage
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n shadow-idp

# Check Minikube resources
minikube ssh
df -h
free -h
```

## 🧪 Testing the Local Deployment

### Health Checks
```bash
# Test all services
curl http://shadow-idp.local/health
curl http://api.shadow-idp.local/health
curl http://catalog.shadow-idp.local/health

# Test API endpoints
curl http://api.shadow-idp.local/catalog/services
curl http://catalog.shadow-idp.local/api/services
```

### Database Connectivity
```bash
# Test database connection
kubectl exec -it deployment/postgresql -n shadow-idp -- psql -U shadow_idp -d shadow_idp -c "SELECT version();"

# Test Redis connection
kubectl exec -it deployment/redis -n shadow-idp -- redis-cli -a $(kubectl get secret shadow-idp-db-secrets -n shadow-idp -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d) ping
```

### Monitoring Access
```bash
# Access Prometheus
open http://prometheus.shadow-idp.local

# Access Grafana (when deployed)
open http://grafana.shadow-idp.local
```

## 🔄 Updates and Maintenance

### Update Application Code
```bash
# 1. Make changes to your code
# 2. Rebuild the image
docker build -t local/service-catalog:latest service-catalog/

# 3. Restart the deployment
kubectl rollout restart deployment/service-catalog -n shadow-idp

# 4. Wait for rollout to complete
kubectl rollout status deployment/service-catalog -n shadow-idp
```

### Update Configuration
```bash
# Update ConfigMap
kubectl patch configmap service-catalog-config -n shadow-idp --patch '{"data":{"LOG_LEVEL":"debug"}}'

# Restart deployment to pick up changes
kubectl rollout restart deployment/service-catalog -n shadow-idp
```

### Clean Up
```bash
# Delete all resources
kubectl delete namespace shadow-idp

# Or delete specific components
kubectl delete -f service-catalog/k8s/ -n shadow-idp
kubectl delete -f k8s/infrastructure/ -n shadow-idp
```

## 🚀 Automated Local Deployment Script

Create a local deployment script:

```bash
#!/bin/bash
# local-deploy.sh

set -e

echo "🚀 Starting Shadow IDP local deployment on Minikube..."

# Check Minikube status
if ! minikube status > /dev/null 2>&1; then
    echo "Starting Minikube..."
    minikube start --cpus=4 --memory=8192 --disk-size=50g
fi

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server

# Configure Docker environment
eval $(minikube docker-env)

# Build images
echo "Building Docker images..."
docker build -t local/service-catalog:latest service-catalog/
docker build -t local/api-gateway:latest api-gateway/

# Deploy platform
echo "Deploying to Minikube..."
./scripts/deploy-platform.sh \
  --registry=local \
  --domain=shadow-idp.local \
  --skip-build \
  --namespace=shadow-idp

# Setup local access
MINIKUBE_IP=$(minikube ip)
echo "Adding entries to /etc/hosts..."
echo "$MINIKUBE_IP shadow-idp.local" | sudo tee -a /etc/hosts
echo "$MINIKUBE_IP api.shadow-idp.local" | sudo tee -a /etc/hosts
echo "$MINIKUBE_IP catalog.shadow-idp.local" | sudo tee -a /etc/hosts

echo "✅ Deployment complete!"
echo "🌐 Access the platform at: http://shadow-idp.local"
echo "📊 Service Catalog: http://catalog.shadow-idp.local"
echo "🔌 API Gateway: http://api.shadow-idp.local"
```

## 📝 Local Development Tips

### Performance Optimization
- Use `--skip-tests` during development builds
- Reduce resource limits for faster startup
- Use `imagePullPolicy: Never` for local images
- Enable Minikube's built-in registry for faster image pulls

### Debugging Tips
- Use `kubectl logs -f` for real-time log monitoring
- Use `kubectl exec -it` to access container shells
- Use `minikube dashboard` for visual cluster management
- Use `kubectl port-forward` for direct service access

### Storage Considerations
- Minikube uses hostPath storage by default
- Data persists between pod restarts but not Minikube restarts
- For persistent development data, use external volumes

---

Your Shadow IDP platform is now ready for local development on Minikube! 🎉

This setup provides a complete development environment where you can:
- Build and test all components locally
- Develop with fast iteration cycles
- Debug issues in a controlled environment
- Test the complete platform integration

Happy coding! 🚀
