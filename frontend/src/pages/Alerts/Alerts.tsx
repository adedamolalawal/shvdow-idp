import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Alerts: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: '#f1f5f9', fontWeight: 'bold' }}>
        Alerts & Notifications
      </Typography>
      <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
          Intelligent alerting system will be implemented here.
          This will include alert rule management, notification routing, escalation policies,
          and integration with various notification channels.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Alerts;

