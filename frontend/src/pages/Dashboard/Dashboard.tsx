import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudDone as CloudDoneIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data
const deploymentData = [
  { name: 'Mon', deployments: 12, success: 10, failed: 2 },
  { name: 'Tue', deployments: 19, success: 17, failed: 2 },
  { name: 'Wed', deployments: 15, success: 14, failed: 1 },
  { name: 'Thu', deployments: 22, success: 20, failed: 2 },
  { name: 'Fri', deployments: 18, success: 16, failed: 2 },
  { name: 'Sat', deployments: 8, success: 8, failed: 0 },
  { name: 'Sun', deployments: 5, success: 5, failed: 0 },
];

const serviceHealthData = [
  { name: 'Healthy', value: 85, color: '#10b981' },
  { name: 'Warning', value: 12, color: '#f59e0b' },
  { name: 'Critical', value: 3, color: '#ef4444' },
];

const recentDeployments = [
  { id: 1, service: 'user-service', version: 'v1.2.3', status: 'success', time: '2 minutes ago' },
  { id: 2, service: 'payment-api', version: 'v2.1.0', status: 'success', time: '15 minutes ago' },
  { id: 3, service: 'notification-service', version: 'v1.5.2', status: 'failed', time: '1 hour ago' },
  { id: 4, service: 'auth-service', version: 'v3.0.1', status: 'success', time: '2 hours ago' },
];

const alerts = [
  { id: 1, message: 'High CPU usage on payment-api', severity: 'warning', time: '5 minutes ago' },
  { id: 2, message: 'Database connection pool exhausted', severity: 'critical', time: '10 minutes ago' },
  { id: 3, message: 'SSL certificate expires in 7 days', severity: 'warning', time: '1 hour ago' },
];

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, change, icon, color }) => (
  <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="#94a3b8" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 'bold' }}>
            {value}
          </Typography>
          {change && (
            <Typography variant="body2" sx={{ color: color, mt: 1 }}>
              {change}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ backgroundColor: color, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#f1f5f9', fontWeight: 'bold' }}>
        Platform Overview
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Services"
            value={127}
            change="+5 this week"
            icon={<CloudDoneIcon />}
            color="#6366f1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Deployments Today"
            value={23}
            change="+12% from yesterday"
            icon={<TrendingUpIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Success Rate"
            value="98.5%"
            change="+0.3% this week"
            icon={<SpeedIcon />}
            color="#06b6d4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Alerts"
            value={7}
            change="-2 from yesterday"
            icon={<SecurityIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Deployment Trends */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#f1f5f9' }}>
              Deployment Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={deploymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Successful"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Service Health */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#f1f5f9' }}>
              Service Health
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceHealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {serviceHealthData.map((item) => (
                <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: item.color,
                      borderRadius: '50%',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#f1f5f9', flexGrow: 1 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    {item.value}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Recent Deployments */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#f1f5f9' }}>
              Recent Deployments
            </Typography>
            <List>
              {recentDeployments.map((deployment) => (
                <ListItem key={deployment.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {deployment.status === 'success' ? (
                      <CheckCircleIcon sx={{ color: '#10b981' }} />
                    ) : (
                      <ErrorIcon sx={{ color: '#ef4444' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ color: '#f1f5f9' }}>
                          {deployment.service}
                        </Typography>
                        <Chip
                          label={deployment.version}
                          size="small"
                          sx={{
                            backgroundColor: '#334155',
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        {deployment.time}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Active Alerts */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#f1f5f9' }}>
              Active Alerts
            </Typography>
            <List>
              {alerts.map((alert) => (
                <ListItem key={alert.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {alert.severity === 'critical' ? (
                      <ErrorIcon sx={{ color: '#ef4444' }} />
                    ) : (
                      <WarningIcon sx={{ color: '#f59e0b' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ color: '#f1f5f9' }}>
                        {alert.message}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={alert.severity}
                          size="small"
                          sx={{
                            backgroundColor: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                          }}
                        />
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {alert.time}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

