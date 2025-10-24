#!/bin/bash

# Shadow IDP Service Catalog - Kubernetes Deployment Script
# This script deploys the Service Catalog to a Kubernetes cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="shadow-idp"
APP_NAME="service-catalog"
IMAGE_NAME="shadow-idp/service-catalog"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOMAIN="${DOMAIN:-service-catalog.your-domain.com}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if kustomize is installed
    if ! command -v kustomize &> /dev/null; then
        log_warning "kustomize is not installed. Using kubectl apply instead."
        USE_KUSTOMIZE=false
    else
        USE_KUSTOMIZE=true
    fi
    
    # Check if docker is installed (for building)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Skipping image build."
        SKIP_BUILD=true
    else
        SKIP_BUILD=false
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

build_image() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping image build"
        return
    fi
    
    log_info "Building Docker image..."
    
    # Build the image
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    
    # Tag for registry if specified
    if [ -n "$REGISTRY" ]; then
        docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        log_info "Pushing image to registry..."
        docker push "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    fi
    
    log_success "Image build completed"
}

create_namespace() {
    log_info "Creating namespace..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f k8s/namespace.yaml
        log_success "Namespace created"
    fi
}

update_secrets() {
    log_info "Updating secrets..."
    
    # Check if secrets need to be updated
    if [ -n "$DB_PASSWORD" ]; then
        log_info "Updating database password..."
        kubectl create secret generic service-catalog-secrets \
            --from-literal=DB_USER="${DB_USER:-service_catalog}" \
            --from-literal=DB_PASSWORD="$DB_PASSWORD" \
            --from-literal=JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    if [ -n "$POSTGRES_PASSWORD" ]; then
        log_info "Updating PostgreSQL password..."
        kubectl create secret generic postgresql-secret \
            --from-literal=POSTGRES_DB="${POSTGRES_DB:-service_catalog}" \
            --from-literal=POSTGRES_USER="${POSTGRES_USER:-service_catalog}" \
            --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    log_success "Secrets updated"
}

update_config() {
    log_info "Updating configuration..."
    
    # Update domain in ingress if specified
    if [ -n "$DOMAIN" ]; then
        sed -i.bak "s/service-catalog\.your-domain\.com/$DOMAIN/g" k8s/ingress.yaml
        log_info "Updated domain to $DOMAIN"
    fi
    
    # Update image tag in deployment
    if [ -n "$REGISTRY" ]; then
        sed -i.bak "s|shadow-idp/service-catalog:latest|$REGISTRY/$IMAGE_NAME:$IMAGE_TAG|g" k8s/deployment.yaml
    else
        sed -i.bak "s|shadow-idp/service-catalog:latest|$IMAGE_NAME:$IMAGE_TAG|g" k8s/deployment.yaml
    fi
    
    log_success "Configuration updated"
}

deploy_resources() {
    log_info "Deploying Kubernetes resources..."
    
    if [ "$USE_KUSTOMIZE" = true ]; then
        log_info "Using Kustomize for deployment..."
        kustomize build k8s | kubectl apply -f -
    else
        log_info "Using kubectl apply for deployment..."
        kubectl apply -f k8s/
    fi
    
    log_success "Resources deployed"
}

wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/$APP_NAME -n $NAMESPACE
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready --timeout=300s pod -l app.kubernetes.io/name=$APP_NAME -n $NAMESPACE
    
    log_success "Deployment is ready"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check deployment status
    kubectl get deployment $APP_NAME -n $NAMESPACE
    
    # Check pods
    kubectl get pods -l app.kubernetes.io/name=$APP_NAME -n $NAMESPACE
    
    # Check services
    kubectl get services -l app.kubernetes.io/name=$APP_NAME -n $NAMESPACE
    
    # Check ingress
    kubectl get ingress -n $NAMESPACE
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if kubectl port-forward service/$APP_NAME-service 8080:80 -n $NAMESPACE &
    then
        PORTFORWARD_PID=$!
        sleep 5
        
        if curl -f http://localhost:8080/health &> /dev/null; then
            log_success "Health check passed"
        else
            log_warning "Health check failed"
        fi
        
        kill $PORTFORWARD_PID 2>/dev/null || true
    fi
    
    log_success "Deployment verification completed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Restore original files
    if [ -f k8s/ingress.yaml.bak ]; then
        mv k8s/ingress.yaml.bak k8s/ingress.yaml
    fi
    
    if [ -f k8s/deployment.yaml.bak ]; then
        mv k8s/deployment.yaml.bak k8s/deployment.yaml
    fi
    
    log_success "Cleanup completed"
}

show_access_info() {
    log_info "Deployment completed successfully!"
    echo
    echo "Access Information:"
    echo "=================="
    
    # Get ingress information
    INGRESS_IP=$(kubectl get ingress $APP_NAME-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")
    INGRESS_HOST=$(kubectl get ingress $APP_NAME-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not configured")
    
    echo "Dashboard URL: https://$INGRESS_HOST"
    echo "API Endpoint: https://$INGRESS_HOST/api"
    echo "Health Check: https://$INGRESS_HOST/health"
    echo
    echo "Ingress IP: $INGRESS_IP"
    echo
    echo "Port Forward (for local access):"
    echo "kubectl port-forward service/$APP_NAME-service 8080:80 -n $NAMESPACE"
    echo "Then access: http://localhost:8080"
    echo
    echo "Logs:"
    echo "kubectl logs -f deployment/$APP_NAME -n $NAMESPACE"
    echo
    echo "Scale deployment:"
    echo "kubectl scale deployment/$APP_NAME --replicas=5 -n $NAMESPACE"
}

# Main execution
main() {
    log_info "Starting Shadow IDP Service Catalog deployment..."
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    build_image
    create_namespace
    update_secrets
    update_config
    deploy_resources
    wait_for_deployment
    verify_deployment
    show_access_info
    
    log_success "Deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-build          Skip Docker image build"
            echo "  --registry REGISTRY   Docker registry to push to"
            echo "  --domain DOMAIN       Domain for ingress"
            echo "  --namespace NAMESPACE Kubernetes namespace (default: shadow-idp)"
            echo "  --image-tag TAG       Docker image tag (default: latest)"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
