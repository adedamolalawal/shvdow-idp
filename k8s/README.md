# Shadow IDP - Kubernetes Deployment

This directory contains all Kubernetes manifests and setup scripts for deploying the Shadow IDP platform on Kubernetes.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│   API Gateway   │───▶│ Service Catalog │
│   (React App)   │    │   (Port 8080)   │    │   (Port 8081)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Ingress     │    │   ConfigMaps    │    │ PersistentVolume│
│   (nginx)       │    │   & Secrets     │    │   (SQLite DB)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Directory Structure

```
k8s/
├── namespaces/          # Kubernetes namespaces
├── deployments/         # Application deployments
├── services/           # Kubernetes services
├── configmaps/         # Configuration management
├── secrets/            # Sensitive data
├── ingress/            # Ingress controllers
├── rbac/               # Role-based access control
├── setup/              # Setup and utility scripts
├── argocd/             # ArgoCD GitOps configuration
├── monitoring/         # Monitoring and observability
└── README.md           # This file
```

## 🚀 Quick Start with Minikube

### Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- [Docker](https://docs.docker.com/get-docker/) installed
- At least 8GB RAM and 4 CPU cores available

### 1. Setup Minikube Cluster

```bash
cd k8s/setup
./minikube-setup.sh
```

This script will:
- Start Minikube with appropriate resources
- Enable required addons (ingress, metrics-server, storage)
- Create namespaces and RBAC
- Build Docker images
- Deploy all services
- Configure ingress and /etc/hosts entries

### 2. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n shadow-idp

# Check services
kubectl get svc -n shadow-idp

# Check ingress
kubectl get ingress -n shadow-idp
```

### 3. Access the Platform

- **Main Platform**: http://shadow-idp.local
- **API Gateway**: http://api-gateway.shadow-idp.local
- **Service Catalog**: http://service-catalog.shadow-idp.local

## 🔧 Manual Deployment

If you prefer to deploy manually or understand each step:

### 1. Create Namespaces

```bash
kubectl apply -f namespaces/shadow-idp.yaml
```

### 2. Setup RBAC

```bash
kubectl apply -f rbac/shadow-idp-rbac.yaml
```

### 3. Create Secrets and ConfigMaps

```bash
kubectl apply -f secrets/api-gateway-secrets.yaml
kubectl apply -f configmaps/service-catalog-config.yaml
kubectl apply -f configmaps/api-gateway-config.yaml
```

### 4. Build Docker Images

```bash
# Set Docker environment to Minikube
eval $(minikube docker-env)

# Build Service Catalog
cd ../service-catalog
docker build -t shadow-idp/service-catalog:latest .

# Build API Gateway
cd ../api-gateway
docker build -t shadow-idp/api-gateway:latest .
```

### 5. Deploy Applications

```bash
kubectl apply -f deployments/service-catalog.yaml
kubectl apply -f deployments/api-gateway.yaml
```

### 6. Create Services

```bash
kubectl apply -f services/service-catalog.yaml
kubectl apply -f services/api-gateway.yaml
```

### 7. Setup Ingress

```bash
kubectl apply -f ingress/shadow-idp-ingress.yaml
```

## 📊 Monitoring and Debugging

### View Logs

```bash
# API Gateway logs
kubectl logs -f deployment/api-gateway -n shadow-idp

# Service Catalog logs
kubectl logs -f deployment/service-catalog -n shadow-idp

# All pods in namespace
kubectl logs -f -l app.kubernetes.io/part-of=shadow-idp-platform -n shadow-idp
```

### Check Pod Status

```bash
# Get pod details
kubectl describe pods -n shadow-idp

# Get events
kubectl get events -n shadow-idp --sort-by='.lastTimestamp'
```

### Port Forwarding (for debugging)

```bash
# Forward API Gateway
kubectl port-forward deployment/api-gateway 8080:8080 -n shadow-idp

# Forward Service Catalog
kubectl port-forward deployment/service-catalog 8081:8081 -n shadow-idp
```

## 🔄 Configuration Management

### ConfigMaps

Configuration is managed through Kubernetes ConfigMaps:

- `service-catalog-config`: Service Catalog settings
- `api-gateway-config`: API Gateway settings

### Secrets

Sensitive data is stored in Kubernetes Secrets:

- `api-gateway-secrets`: JWT secrets and API keys

### Updating Configuration

```bash
# Edit ConfigMap
kubectl edit configmap service-catalog-config -n shadow-idp

# Restart deployment to pick up changes
kubectl rollout restart deployment/service-catalog -n shadow-idp
```

## 🔒 Security

### RBAC

The platform uses Role-Based Access Control (RBAC):

- **ServiceAccount**: `shadow-idp-service-account`
- **Role**: `shadow-idp-role` (read access to configmaps, secrets, pods)
- **RoleBinding**: `shadow-idp-role-binding`

### Security Context

All containers run with:
- Non-root user (UID: 1001)
- Read-only root filesystem where possible
- Dropped capabilities

### Network Policies

Network policies can be added to restrict pod-to-pod communication:

```bash
# Example: Only allow API Gateway to communicate with Service Catalog
kubectl apply -f network-policies/
```

## 📈 Scaling

### Horizontal Pod Autoscaling

```bash
# Enable HPA for API Gateway
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=2 --max=10 -n shadow-idp

# Enable HPA for Service Catalog
kubectl autoscale deployment service-catalog --cpu-percent=70 --min=2 --max=5 -n shadow-idp
```

### Resource Limits

Current resource limits:
- **API Gateway**: 128Mi-512Mi RAM, 100m-500m CPU
- **Service Catalog**: 128Mi-512Mi RAM, 100m-500m CPU

## 🧹 Cleanup

### Remove Shadow IDP

```bash
# Delete all resources in namespace
kubectl delete namespace shadow-idp

# Or delete Minikube entirely
minikube delete
```

### Remove /etc/hosts entries

```bash
sudo sed -i '/shadow-idp.local/d' /etc/hosts
sudo sed -i '/api-gateway.shadow-idp.local/d' /etc/hosts
sudo sed -i '/service-catalog.shadow-idp.local/d' /etc/hosts
```

## 🔮 Next Steps

1. **ArgoCD Integration**: Set up GitOps with ArgoCD
2. **Monitoring**: Deploy Prometheus and Grafana
3. **CI/CD Pipeline**: Automated builds and deployments
4. **Configuration Repository**: Separate repo for GitOps configs
5. **Frontend Deployment**: Containerize and deploy React frontend
6. **Database Migration**: Move from SQLite to PostgreSQL
7. **Service Mesh**: Consider Istio for advanced networking

## 🆘 Troubleshooting

### Common Issues

1. **Pods stuck in Pending**: Check resource availability
   ```bash
   kubectl describe pod <pod-name> -n shadow-idp
   ```

2. **ImagePullBackOff**: Ensure images are built in Minikube's Docker
   ```bash
   eval $(minikube docker-env)
   docker images | grep shadow-idp
   ```

3. **Ingress not working**: Check ingress controller
   ```bash
   kubectl get pods -n ingress-nginx
   ```

4. **Service not accessible**: Check service and endpoints
   ```bash
   kubectl get svc,endpoints -n shadow-idp
   ```

### Getting Help

- Check the [Kubernetes documentation](https://kubernetes.io/docs/)
- Use `kubectl describe` for detailed resource information
- Check logs with `kubectl logs`
- Use `minikube dashboard` for a web UI

## 📝 Contributing

When adding new services or modifying existing ones:

1. Update the appropriate manifests
2. Test in Minikube
3. Update this README
4. Add monitoring and health checks
5. Consider security implications
6. Update the setup script if needed
