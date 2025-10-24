// Dashboard JavaScript for Shadow IDP Service Catalog

class ServiceCatalogDashboard {
    constructor() {
        this.baseUrl = '/api';
        this.services = [];
        this.templates = [];
        this.dependencies = [];
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.setupEventListeners();
        this.initializeCharts();
    }

    async loadDashboardData() {
        try {
            // Load all data in parallel
            const [servicesResponse, templatesResponse, dependenciesResponse] = await Promise.all([
                fetch(`${this.baseUrl}/services`),
                fetch(`${this.baseUrl}/templates`),
                fetch(`${this.baseUrl}/dependencies/graph`)
            ]);

            if (servicesResponse.ok) {
                const servicesData = await servicesResponse.json();
                this.services = servicesData.services || [];
            }

            if (templatesResponse.ok) {
                const templatesData = await templatesResponse.json();
                this.templates = templatesData.templates || [];
            }

            if (dependenciesResponse.ok) {
                const dependenciesData = await dependenciesResponse.json();
                this.dependencies = dependenciesData.edges || [];
            }

            this.updateDashboardStats();
            this.renderServices();
            this.renderTemplates();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardStats() {
        // Update stats cards
        document.getElementById('total-services').textContent = this.services.length;
        
        const healthyServices = this.services.filter(s => s.status === 'healthy').length;
        document.getElementById('healthy-services').textContent = healthyServices;
        
        document.getElementById('total-templates').textContent = this.templates.length;
        document.getElementById('total-dependencies').textContent = this.dependencies.length;
    }

    renderServices() {
        const servicesList = document.getElementById('services-list');
        
        if (this.services.length === 0) {
            servicesList.innerHTML = `
                <div class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-server text-4xl mb-4"></i>
                    <p class="text-lg font-medium">No services found</p>
                    <p class="text-sm">Create your first service to get started</p>
                </div>
            `;
            return;
        }

        const servicesHtml = this.services.map(service => `
            <div class="px-6 py-4 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0">
                            ${this.getServiceTypeIcon(service.serviceType)}
                        </div>
                        <div>
                            <h4 class="text-lg font-medium text-gray-900">${service.name}</h4>
                            <p class="text-sm text-gray-500">${service.description}</p>
                            <div class="flex items-center space-x-4 mt-2">
                                <span class="text-xs text-gray-500">v${service.version}</span>
                                <span class="text-xs text-gray-500">${service.owner}</span>
                                <span class="text-xs text-gray-500">${service.team}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        ${this.getStatusBadge(service.status)}
                        ${this.getLifecycleBadge(service.lifecycle)}
                        <div class="flex space-x-1">
                            <button class="text-gray-400 hover:text-blue-600" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-gray-400 hover:text-green-600" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-gray-400 hover:text-red-600" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                ${service.tags && service.tags.length > 0 ? `
                    <div class="mt-3 flex flex-wrap gap-2">
                        ${service.tags.map(tag => `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        servicesList.innerHTML = servicesHtml;
    }

    renderTemplates() {
        const templatesGrid = document.getElementById('templates-grid');
        
        if (this.templates.length === 0) {
            templatesGrid.innerHTML = `
                <div class="col-span-full text-center text-gray-500 py-8">
                    <i class="fas fa-template text-4xl mb-4"></i>
                    <p class="text-lg font-medium">No templates found</p>
                    <p class="text-sm">Create templates to standardize service creation</p>
                </div>
            `;
            return;
        }

        const templatesHtml = this.templates.map(template => `
            <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            ${this.getServiceTypeIcon(template.serviceType)}
                            <h4 class="text-lg font-medium text-gray-900">${template.name}</h4>
                        </div>
                        <div class="flex space-x-1">
                            <button class="text-gray-400 hover:text-blue-600" title="Use Template">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="text-gray-400 hover:text-green-600" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">${template.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            ${template.serviceType.replace('-', ' ')}
                        </span>
                        <button class="bg-purple-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-purple-700">
                            Use Template
                        </button>
                    </div>
                    ${template.defaultTags && template.defaultTags.length > 0 ? `
                        <div class="mt-3 flex flex-wrap gap-1">
                            ${template.defaultTags.slice(0, 3).map(tag => `
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    ${tag}
                                </span>
                            `).join('')}
                            ${template.defaultTags.length > 3 ? `
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    +${template.defaultTags.length - 3}
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        templatesGrid.innerHTML = templatesHtml;
    }

    getServiceTypeIcon(serviceType) {
        const icons = {
            'api': '<i class="fas fa-code text-blue-600"></i>',
            'web-service': '<i class="fas fa-globe text-green-600"></i>',
            'database': '<i class="fas fa-database text-purple-600"></i>',
            'message-queue': '<i class="fas fa-exchange-alt text-orange-600"></i>',
            'cache': '<i class="fas fa-memory text-red-600"></i>',
            'storage': '<i class="fas fa-hdd text-gray-600"></i>',
            'monitoring': '<i class="fas fa-chart-line text-yellow-600"></i>',
            'security': '<i class="fas fa-shield-alt text-indigo-600"></i>',
            'infrastructure': '<i class="fas fa-server text-gray-700"></i>',
            'library': '<i class="fas fa-book text-teal-600"></i>',
            'tool': '<i class="fas fa-wrench text-pink-600"></i>',
            'other': '<i class="fas fa-cube text-gray-500"></i>'
        };
        return icons[serviceType] || icons['other'];
    }

    getStatusBadge(status) {
        const badges = {
            'healthy': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Healthy</span>',
            'unhealthy': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Unhealthy</span>',
            'degraded': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Degraded</span>',
            'maintenance': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Maintenance</span>',
            'unknown': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>'
        };
        return badges[status] || badges['unknown'];
    }

    getLifecycleBadge(lifecycle) {
        const badges = {
            'planning': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Planning</span>',
            'development': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Development</span>',
            'testing': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Testing</span>',
            'staging': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Staging</span>',
            'production': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Production</span>',
            'deprecated': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Deprecated</span>',
            'retired': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Retired</span>'
        };
        return badges[lifecycle] || badges['development'];
    }

    setupEventListeners() {
        // Service search
        const serviceSearch = document.getElementById('service-search');
        serviceSearch.addEventListener('input', (e) => {
            this.filterServices(e.target.value);
        });

        // Service filter
        const serviceFilter = document.getElementById('service-filter');
        serviceFilter.addEventListener('change', (e) => {
            this.filterServicesByType(e.target.value);
        });

        // Metrics period
        const metricsPeriod = document.getElementById('metrics-period');
        metricsPeriod.addEventListener('change', (e) => {
            this.updateMetrics(e.target.value);
        });
    }

    filterServices(searchTerm) {
        const filteredServices = this.services.filter(service => 
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.team.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredServices(filteredServices);
    }

    filterServicesByType(serviceType) {
        const filteredServices = serviceType 
            ? this.services.filter(service => service.serviceType === serviceType)
            : this.services;
        this.renderFilteredServices(filteredServices);
    }

    renderFilteredServices(services) {
        // Temporarily update services for rendering
        const originalServices = this.services;
        this.services = services;
        this.renderServices();
        this.services = originalServices;
    }

    initializeCharts() {
        this.initHealthChart();
        this.initResponseTimeChart();
    }

    initHealthChart() {
        const ctx = document.getElementById('health-chart').getContext('2d');
        
        // Sample data - in real implementation, this would come from metrics API
        const healthData = {
            labels: ['Healthy', 'Degraded', 'Unhealthy', 'Unknown'],
            datasets: [{
                data: [
                    this.services.filter(s => s.status === 'healthy').length,
                    this.services.filter(s => s.status === 'degraded').length,
                    this.services.filter(s => s.status === 'unhealthy').length,
                    this.services.filter(s => s.status === 'unknown').length
                ],
                backgroundColor: [
                    '#10B981', // green
                    '#F59E0B', // yellow
                    '#EF4444', // red
                    '#6B7280'  // gray
                ],
                borderWidth: 0
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: healthData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initResponseTimeChart() {
        const ctx = document.getElementById('response-time-chart').getContext('2d');
        
        // Sample data - in real implementation, this would come from metrics API
        const responseTimeData = {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Average Response Time (ms)',
                data: [120, 150, 180, 200, 170, 140],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: responseTimeData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async updateMetrics(period) {
        try {
            const response = await fetch(`${this.baseUrl}/metrics/services?period=${period}`);
            if (response.ok) {
                const data = await response.json();
                // Update charts with new data
                console.log('Metrics updated for period:', period, data);
            }
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    showError(message) {
        // Simple error display - in real implementation, use a proper notification system
        console.error(message);
        alert(message);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ServiceCatalogDashboard();
});
