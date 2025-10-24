#!/bin/bash

# Shadow IDP - Local Minikube Deployment Script
# This script builds and deploys the Shadow IDP platform locally on Minikube

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-shadow-idp}"
DOMAIN="${DOMAIN:-shadow-idp.local}"
SKIP_BUILD="${SKIP_BUILD:-false}"
VERBOSE="${VERBOSE:-false}"

# Print functions
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  Shadow IDP Local Deployment${NC}"
    echo -e "${PURPLE}  Minikube + Docker Build${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Shadow IDP Local Minikube Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --namespace NAMESPACE       Kubernetes namespace (default: shadow-idp)
    --domain DOMAIN            Base domain (default: shadow-idp.local)
    --skip-build               Skip building container images
    --verbose                  Enable verbose output
    --help                     Show this help message

EXAMPLES:
    # Basic local deployment
    $0

    # Skip building images (use existing)
    $0 --skip-build

    # Custom domain
    $0 --domain my-idp.local

    # Verbose output
    $0 --verbose

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --skip-build)
                SKIP_BUILD="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command -v minikube &> /dev/null; then
        missing_tools+=("minikube")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v docker &> /dev/null && [[ "$SKIP_BUILD" != "true" ]]; then
        missing_tools+=("docker")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check Minikube status
    if ! minikube status &> /dev/null; then
        print_warning "Minikube is not running. Starting Minikube..."
        minikube start --cpus=4 --memory=8192 --disk-size=50g
    fi
    
    print_success "Prerequisites check passed"
}

# Setup Minikube environment
setup_minikube() {
    print_step "Setting up Minikube environment..."
    
    # Enable required addons
    print_info "Enabling Minikube addons..."
    minikube addons enable ingress
    minikube addons enable metrics-server
    minikube addons enable storage-provisioner
    
    # Configure Docker environment to use Minikube's Docker daemon
    print_info "Configuring Docker environment..."
    eval $(minikube docker-env)
    
    # Verify Docker is using Minikube
    if docker ps | grep -q "k8s_"; then
        print_success "Docker is configured to use Minikube's daemon"
    else
        print_warning "Docker may not be using Minikube's daemon"
    fi
    
    print_success "Minikube environment setup complete"
}

# Build container images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        print_info "Skipping image builds"
        return
    fi
    
    print_step "Building container images locally..."
    
    # Build Service Catalog
    print_info "Building service-catalog..."
    if [[ -d "service-catalog" ]]; then
        (cd service-catalog && docker build -t local/service-catalog:latest .)
        print_success "Built local/service-catalog:latest"
    else
        print_warning "service-catalog directory not found"
    fi
    
    # Build API Gateway
    print_info "Building api-gateway..."
    if [[ -d "api-gateway" ]]; then
        (cd api-gateway && docker build -t local/api-gateway:latest .)
        print_success "Built local/api-gateway:latest"
    else
        print_warning "api-gateway directory not found"
    fi
    
    # Build other services
    local services=("cicd-engine" "alert-engine" "docs-engine" "metrics-collector" "team-management" "gitops-core")
    for service in "${services[@]}"; do
        if [[ -d "services/$service" ]]; then
            print_info "Building $service..."
            if [[ -f "services/$service/Dockerfile" ]]; then
                (cd "services/$service" && docker build -t "local/$service:latest" .)
                print_success "Built local/$service:latest"
            else
                print_warning "No Dockerfile found for $service"
            fi
        else
            print_warning "services/$service directory not found"
        fi
    done
    
    print_success "Image building complete"
}

# Create namespace and secrets
setup_namespace() {
    print_step "Setting up Kubernetes namespace and secrets..."
    
    # Create namespace
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Namespace '$NAMESPACE' already exists"
    else
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
        kubectl label namespace "$NAMESPACE" app.kubernetes.io/name="shadow-idp"
        print_success "Created namespace '$NAMESPACE'"
    fi
    
    # Create secrets
    print_info "Creating secrets..."
    kubectl create secret generic shadow-idp-db-secrets \
        --from-literal=DB_PASSWORD="local-dev-password" \
        --from-literal=POSTGRES_PASSWORD="local-postgres-password" \
        --from-literal=JWT_SECRET="local-jwt-secret-for-development" \
        --from-literal=REDIS_PASSWORD="local-redis-password" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Namespace and secrets setup complete"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_step "Deploying infrastructure components..."
    
    # Deploy PostgreSQL
    if [[ -f "k8s/infrastructure/postgresql.yaml" ]]; then
        print_info "Deploying PostgreSQL..."
        kubectl apply -f k8s/infrastructure/postgresql.yaml -n "$NAMESPACE"
        print_success "PostgreSQL deployed"
    fi
    
    # Deploy Redis
    if [[ -f "k8s/infrastructure/redis.yaml" ]]; then
        print_info "Deploying Redis..."
        kubectl apply -f k8s/infrastructure/redis.yaml -n "$NAMESPACE"
        print_success "Redis deployed"
    fi
    
    # Deploy Prometheus
    if [[ -f "k8s/monitoring/prometheus.yaml" ]]; then
        print_info "Deploying Prometheus..."
        kubectl apply -f k8s/monitoring/prometheus.yaml -n "$NAMESPACE"
        print_success "Prometheus deployed"
    fi
    
    print_success "Infrastructure deployment complete"
}

# Deploy applications
deploy_applications() {
    print_step "Deploying application services..."
    
    # Update Service Catalog deployment to use local images
    if [[ -f "service-catalog/k8s/deployment.yaml" ]]; then
        print_info "Deploying Service Catalog..."
        # Create a temporary file with updated image reference
        sed 's|image: shadow-idp/service-catalog:latest|image: local/service-catalog:latest|g; s|imagePullPolicy: IfNotPresent|imagePullPolicy: Never|g' service-catalog/k8s/deployment.yaml > /tmp/service-catalog-deployment.yaml
        kubectl apply -f service-catalog/k8s/configmap.yaml -n "$NAMESPACE" 2>/dev/null || true
        kubectl apply -f service-catalog/k8s/secret.yaml -n "$NAMESPACE" 2>/dev/null || true
        kubectl apply -f service-catalog/k8s/rbac.yaml -n "$NAMESPACE" 2>/dev/null || true
        kubectl apply -f /tmp/service-catalog-deployment.yaml -n "$NAMESPACE"
        kubectl apply -f service-catalog/k8s/service.yaml -n "$NAMESPACE"
        kubectl apply -f service-catalog/k8s/hpa.yaml -n "$NAMESPACE" 2>/dev/null || true
        rm /tmp/service-catalog-deployment.yaml
        print_success "Service Catalog deployed"
    fi
    
    # Deploy other services if they exist
    if [[ -d "k8s/deployments" ]]; then
        print_info "Deploying other services..."
        # Update image references to use local registry
        for deployment in k8s/deployments/*.yaml; do
            if [[ -f "$deployment" ]]; then
                sed 's|image: shadow-idp/|image: local/|g; s|imagePullPolicy: IfNotPresent|imagePullPolicy: Never|g' "$deployment" | kubectl apply -f - -n "$NAMESPACE"
            fi
        done
        
        # Apply services and configmaps
        kubectl apply -f k8s/services/ -n "$NAMESPACE" 2>/dev/null || true
        kubectl apply -f k8s/configmaps/ -n "$NAMESPACE" 2>/dev/null || true
    fi
    
    print_success "Application deployment complete"
}

# Configure ingress
setup_ingress() {
    print_step "Configuring ingress..."
    
    if [[ -f "k8s/ingress/shadow-idp-ingress.yaml" ]]; then
        print_info "Deploying ingress with domain: $DOMAIN"
        # Replace domain placeholder and apply
        sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" k8s/ingress/shadow-idp-ingress.yaml | kubectl apply -f - -n "$NAMESPACE"
        print_success "Ingress configured"
    else
        print_warning "Ingress configuration not found"
    fi
}

# Wait for deployments
wait_for_deployments() {
    print_step "Waiting for deployments to be ready..."
    
    local deployments=("postgresql" "redis" "service-catalog")
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            print_info "Waiting for $deployment to be ready..."
            kubectl wait --for=condition=available --timeout=300s deployment/"$deployment" -n "$NAMESPACE" || {
                print_warning "Timeout waiting for $deployment"
            }
        fi
    done
    
    print_success "Deployments are ready"
}

# Setup local access
setup_local_access() {
    print_step "Setting up local access..."
    
    local minikube_ip=$(minikube ip)
    print_info "Minikube IP: $minikube_ip"
    
    # Check if entries already exist in /etc/hosts
    if ! grep -q "$DOMAIN" /etc/hosts; then
        print_info "Adding entries to /etc/hosts..."
        echo "# Shadow IDP Local Development" | sudo tee -a /etc/hosts
        echo "$minikube_ip $DOMAIN" | sudo tee -a /etc/hosts
        echo "$minikube_ip api.$DOMAIN" | sudo tee -a /etc/hosts
        echo "$minikube_ip catalog.$DOMAIN" | sudo tee -a /etc/hosts
        echo "$minikube_ip grafana.$DOMAIN" | sudo tee -a /etc/hosts
        echo "$minikube_ip prometheus.$DOMAIN" | sudo tee -a /etc/hosts
        print_success "Added entries to /etc/hosts"
    else
        print_info "Entries already exist in /etc/hosts"
    fi
    
    print_info "Alternative: Run 'minikube tunnel' in a separate terminal for direct access"
}

# Show access information
show_access_info() {
    print_step "Access Information"
    
    echo ""
    echo -e "${GREEN}🎉 Shadow IDP Local Deployment Complete!${NC}"
    echo ""
    echo -e "${CYAN}Access URLs:${NC}"
    echo -e "  Main Dashboard:      http://$DOMAIN"
    echo -e "  API Gateway:         http://api.$DOMAIN"
    echo -e "  Service Catalog:     http://catalog.$DOMAIN"
    echo -e "  Prometheus:          http://prometheus.$DOMAIN"
    echo ""
    echo -e "${CYAN}Port Forward Access (alternative):${NC}"
    echo -e "  Service Catalog:     kubectl port-forward service/service-catalog-service 8081:80 -n $NAMESPACE"
    echo -e "  API Gateway:         kubectl port-forward service/api-gateway-service 8080:80 -n $NAMESPACE"
    echo -e "  Prometheus:          kubectl port-forward service/prometheus-service 9090:9090 -n $NAMESPACE"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  View pods:           kubectl get pods -n $NAMESPACE"
    echo -e "  View services:       kubectl get services -n $NAMESPACE"
    echo -e "  View logs:           kubectl logs -f deployment/service-catalog -n $NAMESPACE"
    echo -e "  Minikube dashboard:  minikube dashboard"
    echo -e "  Minikube tunnel:     minikube tunnel"
    echo ""
    echo -e "${CYAN}Development Workflow:${NC}"
    echo -e "  1. Make code changes"
    echo -e "  2. Rebuild image:    docker build -t local/service-catalog:latest service-catalog/"
    echo -e "  3. Restart pod:      kubectl rollout restart deployment/service-catalog -n $NAMESPACE"
    echo -e "  4. Check logs:       kubectl logs -f deployment/service-catalog -n $NAMESPACE"
    echo ""
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Deployment failed!"
        print_info "Check the logs above for details"
        print_info "You can clean up with: kubectl delete namespace $NAMESPACE"
    fi
}

# Main function
main() {
    trap cleanup EXIT
    
    print_header
    
    parse_args "$@"
    
    if [[ "$VERBOSE" == "true" ]]; then
        set -x
    fi
    
    print_info "Configuration:"
    print_info "  Namespace: $NAMESPACE"
    print_info "  Domain: $DOMAIN"
    print_info "  Skip Build: $SKIP_BUILD"
    print_info "  Verbose: $VERBOSE"
    echo ""
    
    check_prerequisites
    setup_minikube
    build_images
    setup_namespace
    deploy_infrastructure
    deploy_applications
    setup_ingress
    wait_for_deployments
    setup_local_access
    show_access_info
    
    print_success "Shadow IDP local deployment completed successfully!"
}

# Run main function
main "$@"
