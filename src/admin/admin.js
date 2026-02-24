// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
        this.updateCharCount();
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Maintenance controls
        document.getElementById('toggle-maintenance').addEventListener('click', () => {
            this.toggleMaintenance();
        });

        document.getElementById('enable-maintenance').addEventListener('click', () => {
            this.enableMaintenance();
        });

        document.getElementById('disable-maintenance').addEventListener('click', () => {
            this.disableMaintenance();
        });

        document.getElementById('update-message').addEventListener('click', () => {
            this.updateMessage();
        });

        // Status refresh
        document.getElementById('refresh-status').addEventListener('click', () => {
            this.loadStatus();
        });

        // Quick actions
        document.getElementById('view-history').addEventListener('click', () => {
            this.showHistory();
        });

        document.getElementById('system-health').addEventListener('click', () => {
            this.showSystemHealth();
        });

        // Modal close buttons
        document.getElementById('close-history').addEventListener('click', () => {
            this.closeModal('history-modal');
        });

        document.getElementById('close-health').addEventListener('click', () => {
            this.closeModal('health-modal');
        });

        // Character count for message textarea
        document.getElementById('maintenance-message').addEventListener('input', () => {
            this.updateCharCount();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async checkAuth() {
        if (!this.token) {
            this.showLogin();
            return;
        }

        try {
            const response = await this.apiCall('/api/admin/verify', 'GET');
            if (response.success) {
                this.showAdminPanel(response.data.username);
                this.loadStatus();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        if (!username || !password) {
            this.showError(errorDiv, 'Please enter both username and password');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/admin/login', 'POST', {
                username,
                password
            });

            if (response.success) {
                this.token = response.data.token;
                localStorage.setItem('adminToken', this.token);
                this.showAdminPanel(response.data.username);
                this.loadStatus();
                this.showToast('Login successful!', 'success');
            } else {
                this.showError(errorDiv, response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(errorDiv, 'Login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
    }

    async loadStatus() {
        try {
            const response = await this.apiCall('/api/admin/maintenance/status', 'GET');
            if (response.success) {
                this.updateStatusDisplay(response.data);
            }
        } catch (error) {
            console.error('Failed to load status:', error);
            this.showToast('Failed to load system status', 'error');
        }
    }

    async toggleMaintenance() {
        const message = document.getElementById('maintenance-message').value;
        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/admin/maintenance/toggle', 'POST', {
                message: message || undefined
            });

            if (response.success) {
                this.loadStatus();
                this.showToast(response.message, 'success');
            } else {
                this.showToast(response.message || 'Failed to toggle maintenance mode', 'error');
            }
        } catch (error) {
            console.error('Toggle maintenance error:', error);
            this.showToast('Failed to toggle maintenance mode', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async enableMaintenance() {
        const message = document.getElementById('maintenance-message').value;
        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/admin/maintenance/enable', 'POST', {
                message: message || undefined
            });

            if (response.success) {
                this.loadStatus();
                this.showToast('Maintenance mode enabled', 'warning');
            } else {
                this.showToast(response.message || 'Failed to enable maintenance mode', 'error');
            }
        } catch (error) {
            console.error('Enable maintenance error:', error);
            this.showToast('Failed to enable maintenance mode', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async disableMaintenance() {
        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/admin/maintenance/disable', 'POST');

            if (response.success) {
                this.loadStatus();
                this.showToast('Maintenance mode disabled', 'success');
            } else {
                this.showToast(response.message || 'Failed to disable maintenance mode', 'error');
            }
        } catch (error) {
            console.error('Disable maintenance error:', error);
            this.showToast('Failed to disable maintenance mode', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async updateMessage() {
        const message = document.getElementById('maintenance-message').value;

        if (!message.trim()) {
            this.showToast('Please enter a maintenance message', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/admin/maintenance/message', 'PUT', {
                message
            });

            if (response.success) {
                this.loadStatus();
                this.showToast('Maintenance message updated', 'success');
            } else {
                this.showToast(response.message || 'Failed to update message', 'error');
            }
        } catch (error) {
            console.error('Update message error:', error);
            this.showToast('Failed to update maintenance message', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async showHistory() {
        this.showModal('history-modal');
        document.getElementById('history-content').innerHTML = 'Loading...';

        try {
            const response = await this.apiCall('/api/admin/maintenance/history', 'GET');
            if (response.success) {
                this.displayHistory(response.data.history);
            } else {
                document.getElementById('history-content').innerHTML = 'Failed to load history';
            }
        } catch (error) {
            console.error('History error:', error);
            document.getElementById('history-content').innerHTML = 'Failed to load history';
        }
    }

    async showSystemHealth() {
        this.showModal('health-modal');
        document.getElementById('health-content').innerHTML = 'Loading...';

        try {
            const response = await this.apiCall('/api/admin/health', 'GET');
            if (response.success) {
                this.displaySystemHealth(response.data);
            } else {
                document.getElementById('health-content').innerHTML = 'Failed to load system health';
            }
        } catch (error) {
            console.error('Health error:', error);
            document.getElementById('health-content').innerHTML = 'Failed to load system health';
        }
    }

    updateStatusDisplay(data) {
        const systemStatus = document.getElementById('system-status');
        const maintenanceStatus = document.getElementById('maintenance-status');
        const lastUpdated = document.getElementById('last-updated');
        const toggleButton = document.getElementById('toggle-maintenance');
        const toggleText = document.getElementById('toggle-text');
        const messageTextarea = document.getElementById('maintenance-message');

        // Update status indicators
        if (data.maintenanceMode) {
            systemStatus.innerHTML = '<span class="status-indicator status-maintenance">🔧 Under Maintenance</span>';
            maintenanceStatus.innerHTML = '<span class="status-indicator status-maintenance">🔧 Enabled</span>';
            toggleText.textContent = '✅ Disable Maintenance Mode';
            toggleButton.className = 'btn btn-large btn-success';
        } else {
            systemStatus.innerHTML = '<span class="status-indicator status-operational">✅ Operational</span>';
            maintenanceStatus.innerHTML = '<span class="status-indicator status-operational">✅ Disabled</span>';
            toggleText.textContent = '🔧 Enable Maintenance Mode';
            toggleButton.className = 'btn btn-large btn-warning';
        }

        lastUpdated.textContent = new Date(data.timestamp).toLocaleString();
        messageTextarea.value = data.message || '';
        this.updateCharCount();
    }

    displayHistory(history) {
        if (!history || history.length === 0) {
            document.getElementById('history-content').innerHTML = '<p>No maintenance history available.</p>';
            return;
        }

        const historyHtml = history.map(item => `
            <div class="history-item" style="padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>${item.key.replace('_', ' ').toUpperCase()}</strong>
                    <span style="color: #666; font-size: 14px;">${new Date(item.updated_at).toLocaleString()}</span>
                </div>
                <div style="color: #555;">${item.value}</div>
            </div>
        `).join('');

        document.getElementById('history-content').innerHTML = historyHtml;
    }

    displaySystemHealth(data) {
        const healthHtml = `
            <div style="display: grid; gap: 20px;">
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin-bottom: 10px; color: #333;">System Information</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>Status:</strong> ${data.status}</div>
                        <div><strong>Uptime:</strong> ${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m</div>
                        <div><strong>Version:</strong> ${data.version}</div>
                        <div><strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}</div>
                    </div>
                </div>
                ${data.detailed ? `
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin-bottom: 10px; color: #333;">Detailed Information</h4>
                    <div style="display: grid; gap: 8px;">
                        <div><strong>Node Version:</strong> ${data.detailed.nodeVersion}</div>
                        <div><strong>Platform:</strong> ${data.detailed.platform}</div>
                        <div><strong>Environment:</strong> ${data.detailed.environment}</div>
                        <div><strong>Process ID:</strong> ${data.detailed.pid}</div>
                        <div><strong>Memory Usage:</strong> ${Math.round(data.detailed.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(data.detailed.memory.heapTotal / 1024 / 1024)}MB</div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        document.getElementById('health-content').innerHTML = healthHtml;
    }

    updateCharCount() {
        const textarea = document.getElementById('maintenance-message');
        const charCount = document.getElementById('char-count');
        const currentLength = textarea.value.length;
        charCount.textContent = currentLength;
        
        if (currentLength > 450) {
            charCount.style.color = '#dc3545';
        } else if (currentLength > 400) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#666';
        }
    }

    showLogin() {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showAdminPanel(username) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-username').textContent = `Welcome, ${username}`;
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showLoading(show) {
        document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        document.getElementById('toast-container').appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }

        return await response.json();
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});
