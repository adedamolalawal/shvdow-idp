#!/bin/bash

# Shadow IDP Deployment Script
set -e

echo "🚀 Starting Shadow IDP deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Parse command line arguments
ENVIRONMENT="development"
PULL_IMAGES=false
BUILD_IMAGES=false
SKIP_DEPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --pull)
            PULL_IMAGES=true
            shift
            ;;
        --build)
            BUILD_IMAGES=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --help)
            echo "Shadow IDP Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --env ENV        Set environment (development|production) [default: development]"
            echo "  --pull           Pull latest images before starting"
            echo "  --build          Build images locally"
            echo "  --skip-deps      Skip dependency installation"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Start in development mode"
            echo "  $0 --env production --pull   # Start in production mode with latest images"
            echo "  $0 --build                   # Build images locally and start"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_status "Deploying Shadow IDP in $ENVIRONMENT mode..."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/prometheus
mkdir -p data/grafana

# Set appropriate permissions
chmod 755 logs data
chmod -R 755 data/

# Install dependencies if not skipped
if [ "$SKIP_DEPS" = false ]; then
    print_status "Installing frontend dependencies..."
    if [ -d "frontend" ]; then
        cd frontend
        if [ -f "package.json" ]; then
            npm install
        fi
        cd ..
    fi

    print_status "Installing API Gateway dependencies..."
    if [ -d "api-gateway" ]; then
        cd api-gateway
        if [ -f "package.json" ]; then
            npm install
        fi
        cd ..
    fi

    print_status "Installing service dependencies..."
    for service_dir in services/*/; do
        if [ -d "$service_dir" ] && [ -f "${service_dir}package.json" ]; then
            print_status "Installing dependencies for $(basename "$service_dir")..."
            cd "$service_dir"
            npm install
            cd ../..
        fi
    done
fi

# Pull images if requested
if [ "$PULL_IMAGES" = true ]; then
    print_status "Pulling latest images..."
    docker-compose pull
fi

# Build images if requested
if [ "$BUILD_IMAGES" = true ]; then
    print_status "Building images..."
    docker-compose build
fi

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down

# Start infrastructure services first
print_status "Starting infrastructure services..."
docker-compose up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is accessible
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U idp_user -d idp_db > /dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    print_error "Database failed to start"
    exit 1
fi

# Start observability stack
print_status "Starting observability stack..."
docker-compose up -d prometheus grafana jaeger

# Start application services
print_status "Starting application services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 15

# Check service health
services=(
    "api-gateway:8080"
    "frontend:3000"
    "gitops-core:8081"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if wait_for_service "$name" "$port"; then
        continue
    else
        print_warning "$name may not be fully ready, but continuing..."
    fi
done

# Display service URLs
echo ""
print_success "🎉 Shadow IDP deployment completed!"
echo ""
echo "📊 Service URLs:"
echo "  Frontend Dashboard:    http://localhost:3000"
echo "  API Gateway:          http://localhost:8080"
echo "  Grafana:              http://localhost:3001 (admin/admin)"
echo "  Prometheus:           http://localhost:9090"
echo "  Jaeger:               http://localhost:16686"
echo ""
echo "🔧 Service Status:"
docker-compose ps

echo ""
echo "📝 Logs:"
echo "  View all logs:        docker-compose logs -f"
echo "  View specific service: docker-compose logs -f <service-name>"
echo ""
echo "🛑 To stop all services:"
echo "  docker-compose down"
echo ""

# Show resource usage
echo "💾 Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10

print_success "Shadow IDP is now running! 🚀"

