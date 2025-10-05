#!/bin/bash

# Shadow IDP - Centralized Kubernetes Deployment Script
# This script deploys the complete Shadow IDP platform to Kubernetes

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
REGISTRY="${REGISTRY:-shadow-idp}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOMAIN="${DOMAIN:-shadow-idp.local}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Database configuration
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
REDIS_PASSWORD="${REDIS_PASSWORD:-$(openssl rand -base64 32)}"

# Component list
COMPONENTS=(
    "api-gateway"
    "service-catalog"
    "cicd-engine"
    "alert-engine"
    "docs-engine"
    "metrics-collector"
    "team-management"
    "gitops-core"
)

# Infrastructure components
INFRASTRUCTURE=(
    "postgresql"
    "redis"
    "prometheus"
    "grafana"
    "jaeger"
)

# Print functions
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  Shadow IDP Platform Deployment${NC}"
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
Shadow IDP Platform Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --namespace NAMESPACE       Kubernetes namespace (default: shadow-idp)
    --registry REGISTRY         Container registry (default: shadow-idp)
    --image-tag TAG            Image tag (default: latest)
    --domain DOMAIN            Base domain (default: shadow-idp.local)
    --skip-build               Skip building container images
    --skip-tests               Skip running tests
    --dry-run                  Show what would be deployed without applying
    --verbose                  Enable verbose output
    --help                     Show this help message

ENVIRONMENT VARIABLES:
    DB_PASSWORD               Database password (auto-generated if not set)
    POSTGRES_PASSWORD         PostgreSQL password (auto-generated if not set)
    JWT_SECRET               JWT signing secret (auto-generated if not set)
    REDIS_PASSWORD           Redis password (auto-generated if not set)

EXAMPLES:
    # Basic deployment
    $0

    # Deploy to custom domain with specific registry
    $0 --domain idp.company.com --registry gcr.io/my-project

    # Dry run to see what would be deployed
    $0 --dry-run

    # Skip building images (use existing)
    $0 --skip-build

    # Deploy with custom namespace
    $0 --namespace my-idp

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
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --image-tag)
                IMAGE_TAG="$2"
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
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
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
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v docker &> /dev/null && [[ "$SKIP_BUILD" != "true" ]]; then
        missing_tools+=("docker")
    fi
    
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        print_info "Please ensure kubectl is configured and you have access to a cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace '$NAMESPACE' already exists"
    fi
    
    print_success "Prerequisites check passed"
}

# Build container images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        print_info "Skipping image builds"
        return
    fi
    
    print_step "Building container images..."
    
    for component in "${COMPONENTS[@]}"; do
        print_info "Building $component..."
        
        local build_dir=""
        if [[ "$component" == "service-catalog" ]]; then
            build_dir="service-catalog"
        elif [[ "$component" == "api-gateway" ]]; then
            build_dir="api-gateway"
        else
            build_dir="services/$component"
        fi
        
        if [[ ! -d "$build_dir" ]]; then
            print_warning "Directory $build_dir not found, skipping $component"
            continue
        fi
        
        local image_name="$REGISTRY/$component:$IMAGE_TAG"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            print_info "[DRY RUN] Would build: $image_name"
        else
            if [[ -f "$build_dir/Dockerfile" ]]; then
                docker build -t "$image_name" "$build_dir"
                print_success "Built $image_name"
            else
                print_warning "No Dockerfile found in $build_dir, skipping"
            fi
        fi
    done
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        print_info "Skipping tests"
        return
    fi
    
    print_step "Running tests..."
    
    for component in "${COMPONENTS[@]}"; do
        local test_dir=""
        if [[ "$component" == "service-catalog" ]]; then
            test_dir="service-catalog"
        elif [[ "$component" == "api-gateway" ]]; then
            test_dir="api-gateway"
        else
            test_dir="services/$component"
        fi
        
        if [[ -f "$test_dir/package.json" ]] && [[ -d "$test_dir/node_modules" ]]; then
            print_info "Running tests for $component..."
            if [[ "$DRY_RUN" == "true" ]]; then
                print_info "[DRY RUN] Would run tests for $component"
            else
                (cd "$test_dir" && npm test) || print_warning "Tests failed for $component"
            fi
        fi
    done
    
    print_success "Tests completed"
}

# Create namespace
create_namespace() {
    print_step "Creating namespace..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would create namespace: $NAMESPACE"
        return
    fi
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Namespace '$NAMESPACE' already exists"
    else
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
        kubectl label namespace "$NAMESPACE" app.kubernetes.io/name="shadow-idp"
        kubectl label namespace "$NAMESPACE" app.kubernetes.io/version="$IMAGE_TAG"
        print_success "Created namespace '$NAMESPACE'"
    fi
}

# Create secrets
create_secrets() {
    print_step "Creating secrets..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would create secrets in namespace: $NAMESPACE"
        return
    fi
    
    # Database secrets
    kubectl create secret generic shadow-idp-db-secrets \
        --from-literal=DB_PASSWORD="$DB_PASSWORD" \
        --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Created secrets"
}

# Deploy infrastructure components
deploy_infrastructure() {
    print_step "Deploying infrastructure components..."
    
    for component in "${INFRASTRUCTURE[@]}"; do
        print_info "Deploying $component..."
        
        local manifest_file=""
        case $component in
            "postgresql")
                manifest_file="k8s/infrastructure/postgresql.yaml"
                ;;
            "redis")
                manifest_file="k8s/infrastructure/redis.yaml"
                ;;
            "prometheus")
                manifest_file="k8s/monitoring/prometheus.yaml"
                ;;
            "grafana")
                manifest_file="k8s/monitoring/grafana.yaml"
                ;;
            "jaeger")
                manifest_file="k8s/monitoring/jaeger.yaml"
                ;;
        esac
        
        if [[ -f "$manifest_file" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                print_info "[DRY RUN] Would apply: $manifest_file"
            else
                kubectl apply -f "$manifest_file" -n "$NAMESPACE"
                print_success "Deployed $component"
            fi
        else
            print_warning "Manifest not found: $manifest_file"
        fi
    done
}

# Deploy application components
deploy_applications() {
    print_step "Deploying application components..."
    
    for component in "${COMPONENTS[@]}"; do
        print_info "Deploying $component..."
        
        local manifest_dir=""
        if [[ "$component" == "service-catalog" ]]; then
            manifest_dir="service-catalog/k8s"
        else
            manifest_dir="k8s/components/$component"
        fi
        
        if [[ -d "$manifest_dir" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                print_info "[DRY RUN] Would apply manifests from: $manifest_dir"
            else
                # Apply manifests in order
                local manifests=(
                    "configmap.yaml"
                    "secret.yaml"
                    "rbac.yaml"
                    "deployment.yaml"
                    "service.yaml"
                    "hpa.yaml"
                )
                
                for manifest in "${manifests[@]}"; do
                    if [[ -f "$manifest_dir/$manifest" ]]; then
                        kubectl apply -f "$manifest_dir/$manifest" -n "$NAMESPACE"
                    fi
                done
                
                print_success "Deployed $component"
            fi
        else
            print_warning "Manifest directory not found: $manifest_dir"
        fi
    done
}

# Deploy ingress
deploy_ingress() {
    print_step "Deploying ingress configuration..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would deploy ingress for domain: $DOMAIN"
        return
    fi
    
    # Create ingress manifest with domain substitution
    local ingress_file="k8s/ingress/shadow-idp-ingress.yaml"
    if [[ -f "$ingress_file" ]]; then
        # Replace domain placeholder
        sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$ingress_file" | kubectl apply -f - -n "$NAMESPACE"
        print_success "Deployed ingress for domain: $DOMAIN"
    else
        print_warning "Ingress manifest not found: $ingress_file"
    fi
}

# Wait for deployments
wait_for_deployments() {
    print_step "Waiting for deployments to be ready..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would wait for deployments to be ready"
        return
    fi
    
    # Wait for infrastructure first
    for component in "${INFRASTRUCTURE[@]}"; do
        if kubectl get deployment "$component" -n "$NAMESPACE" &> /dev/null; then
            print_info "Waiting for $component to be ready..."
            kubectl wait --for=condition=available --timeout=300s deployment/"$component" -n "$NAMESPACE" || {
                print_warning "Timeout waiting for $component"
            }
        fi
    done
    
    # Wait for applications
    for component in "${COMPONENTS[@]}"; do
        if kubectl get deployment "$component" -n "$NAMESPACE" &> /dev/null; then
            print_info "Waiting for $component to be ready..."
            kubectl wait --for=condition=available --timeout=300s deployment/"$component" -n "$NAMESPACE" || {
                print_warning "Timeout waiting for $component"
            }
        fi
    done
    
    print_success "All deployments are ready"
}

# Verify deployment
verify_deployment() {
    print_step "Verifying deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would verify deployment"
        return
    fi
    
    print_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    
    print_info "Checking service status..."
    kubectl get services -n "$NAMESPACE"
    
    print_info "Checking ingress status..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Health check
    print_info "Running health checks..."
    local failed_checks=0
    
    for component in "${COMPONENTS[@]}"; do
        if kubectl get deployment "$component" -n "$NAMESPACE" &> /dev/null; then
            local ready_replicas=$(kubectl get deployment "$component" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired_replicas=$(kubectl get deployment "$component" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready_replicas" == "$desired_replicas" ]]; then
                print_success "$component: $ready_replicas/$desired_replicas replicas ready"
            else
                print_warning "$component: $ready_replicas/$desired_replicas replicas ready"
                ((failed_checks++))
            fi
        fi
    done
    
    if [[ $failed_checks -eq 0 ]]; then
        print_success "All health checks passed"
    else
        print_warning "$failed_checks health checks failed"
    fi
}

# Show access information
show_access_info() {
    print_step "Access Information"
    
    echo ""
    echo -e "${GREEN}🎉 Shadow IDP Platform Deployment Complete!${NC}"
    echo ""
    echo -e "${CYAN}Access URLs:${NC}"
    echo -e "  Dashboard:      https://$DOMAIN"
    echo -e "  API Gateway:    https://api.$DOMAIN"
    echo -e "  Service Catalog: https://catalog.$DOMAIN"
    echo -e "  Grafana:        https://grafana.$DOMAIN"
    echo -e "  Prometheus:     https://prometheus.$DOMAIN"
    echo ""
    echo -e "${CYAN}Kubernetes Resources:${NC}"
    echo -e "  Namespace:      $NAMESPACE"
    echo -e "  Registry:       $REGISTRY"
    echo -e "  Image Tag:      $IMAGE_TAG"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  View pods:      kubectl get pods -n $NAMESPACE"
    echo -e "  View services:  kubectl get services -n $NAMESPACE"
    echo -e "  View logs:      kubectl logs -f deployment/<component> -n $NAMESPACE"
    echo -e "  Port forward:   kubectl port-forward service/<service> 8080:80 -n $NAMESPACE"
    echo ""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}Note: This was a dry run. No resources were actually deployed.${NC}"
    fi
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
    print_info "  Registry: $REGISTRY"
    print_info "  Image Tag: $IMAGE_TAG"
    print_info "  Domain: $DOMAIN"
    print_info "  Skip Build: $SKIP_BUILD"
    print_info "  Skip Tests: $SKIP_TESTS"
    print_info "  Dry Run: $DRY_RUN"
    echo ""
    
    check_prerequisites
    build_images
    run_tests
    create_namespace
    create_secrets
    deploy_infrastructure
    deploy_applications
    deploy_ingress
    wait_for_deployments
    verify_deployment
    show_access_info
    
    print_success "Shadow IDP Platform deployment completed successfully!"
}

# Run main function
main "$@"
