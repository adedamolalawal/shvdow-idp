#!/bin/bash

# Shadow IDP - Minikube Setup Script
# This script sets up a Minikube cluster for the Shadow IDP platform

set -e

echo "🚀 Setting up Minikube for Shadow IDP Platform..."

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo "❌ Minikube is not installed. Please install it first:"
    echo "   https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first:"
    echo "   https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Start Minikube with appropriate resources
echo "🔧 Starting Minikube cluster..."
minikube start \
    --cpus=4 \
    --memory=8192 \
    --disk-size=20g \
    --driver=docker \
    --kubernetes-version=v1.28.0

# Enable required addons
echo "🔌 Enabling Minikube addons..."
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner
minikube addons enable default-storageclass

# Wait for ingress controller to be ready
echo "⏳ Waiting for ingress controller to be ready..."
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=300s

# Create namespaces
echo "📦 Creating namespaces..."
kubectl apply -f ../namespaces/shadow-idp.yaml

# Create RBAC resources
echo "🔐 Setting up RBAC..."
kubectl apply -f ../rbac/shadow-idp-rbac.yaml

# Create secrets
echo "🔑 Creating secrets..."
kubectl apply -f ../secrets/api-gateway-secrets.yaml

# Create ConfigMaps
echo "⚙️  Creating ConfigMaps..."
kubectl apply -f ../configmaps/service-catalog-config.yaml
kubectl apply -f ../configmaps/api-gateway-config.yaml

# Build Docker images in Minikube's Docker environment
echo "🐳 Building Docker images..."
eval $(minikube docker-env)

# Build Service Catalog image
echo "   Building Service Catalog image..."
cd ../../service-catalog
docker build -t shadow-idp/service-catalog:latest .

# Build API Gateway image
echo "   Building API Gateway image..."
cd ../api-gateway
docker build -t shadow-idp/api-gateway:latest .

cd ../k8s/setup

# Deploy services
echo "🚀 Deploying services..."
kubectl apply -f ../deployments/service-catalog.yaml
kubectl apply -f ../deployments/api-gateway.yaml

# Create services
echo "🌐 Creating services..."
kubectl apply -f ../services/service-catalog.yaml
kubectl apply -f ../services/api-gateway.yaml

# Create ingress
echo "🌍 Creating ingress..."
kubectl apply -f ../ingress/shadow-idp-ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/service-catalog -n shadow-idp
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n shadow-idp

# Get Minikube IP
MINIKUBE_IP=$(minikube ip)

# Add entries to /etc/hosts (requires sudo)
echo "🔧 Adding entries to /etc/hosts..."
echo "You may be prompted for your password to modify /etc/hosts"

# Remove existing entries
sudo sed -i '/shadow-idp.local/d' /etc/hosts
sudo sed -i '/api-gateway.shadow-idp.local/d' /etc/hosts
sudo sed -i '/service-catalog.shadow-idp.local/d' /etc/hosts

# Add new entries
echo "$MINIKUBE_IP shadow-idp.local" | sudo tee -a /etc/hosts
echo "$MINIKUBE_IP api-gateway.shadow-idp.local" | sudo tee -a /etc/hosts
echo "$MINIKUBE_IP service-catalog.shadow-idp.local" | sudo tee -a /etc/hosts

echo ""
echo "✅ Shadow IDP Platform is now running on Minikube!"
echo ""
echo "🌐 Access URLs:"
echo "   Main Platform: http://shadow-idp.local"
echo "   API Gateway:   http://api-gateway.shadow-idp.local"
echo "   Service Catalog: http://service-catalog.shadow-idp.local"
echo ""
echo "🔧 Useful commands:"
echo "   kubectl get pods -n shadow-idp"
echo "   kubectl logs -f deployment/api-gateway -n shadow-idp"
echo "   kubectl logs -f deployment/service-catalog -n shadow-idp"
echo "   minikube dashboard"
echo ""
echo "🧹 To clean up:"
echo "   minikube delete"
echo ""
