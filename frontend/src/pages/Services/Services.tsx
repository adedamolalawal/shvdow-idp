import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Services: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, color: '#f1f5f9', fontWeight: 'bold' }}>
        Service Catalog
      </Typography>
      <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <Typography variant="body1" sx={{ color: '#94a3b8' }}>
          Service catalog and discovery functionality will be implemented here.
          This will include service registration, metadata management, dependency tracking,
          and service health monitoring.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Services;

