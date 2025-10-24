#!/bin/bash

# Create metrics-collector service
cat > services/metrics-collector/package.json << 'PACKAGE'
{
  "name": "shadow-idp-metrics-collector",
  "version": "1.0.0",
  "description": "Metrics Collector for Shadow IDP",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.5.0",
    "typescript": "^5.1.6",
    "ts-node-dev": "^2.0.0"
  }
}
PACKAGE

cat > services/metrics-collector/src/index.ts << 'INDEX'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 8084;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'metrics-collector', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Metrics Collector - Implementation coming soon!');
});

app.listen(port, () => {
  console.log(`Metrics Collector listening on port ${port}`);
});
INDEX

# Create alert-engine service
cat > services/alert-engine/package.json << 'PACKAGE'
{
  "name": "shadow-idp-alert-engine",
  "version": "1.0.0",
  "description": "Alert Engine for Shadow IDP",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.5.0",
    "typescript": "^5.1.6",
    "ts-node-dev": "^2.0.0"
  }
}
PACKAGE

cat > services/alert-engine/src/index.ts << 'INDEX'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 8085;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'alert-engine', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Alert Engine - Implementation coming soon!');
});

app.listen(port, () => {
  console.log(`Alert Engine listening on port ${port}`);
});
INDEX

# Create team-management service
cat > services/team-management/package.json << 'PACKAGE'
{
  "name": "shadow-idp-team-management",
  "version": "1.0.0",
  "description": "Team Management for Shadow IDP",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.5.0",
    "typescript": "^5.1.6",
    "ts-node-dev": "^2.0.0"
  }
}
PACKAGE

cat > services/team-management/src/index.ts << 'INDEX'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 8086;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'team-management', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Team Management - Implementation coming soon!');
});

app.listen(port, () => {
  console.log(`Team Management listening on port ${port}`);
});
INDEX

# Create docs-engine service
cat > services/docs-engine/package.json << 'PACKAGE'
{
  "name": "shadow-idp-docs-engine",
  "version": "1.0.0",
  "description": "Documentation Engine for Shadow IDP",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/node": "^20.5.0",
    "typescript": "^5.1.6",
    "ts-node-dev": "^2.0.0"
  }
}
PACKAGE

cat > services/docs-engine/src/index.ts << 'INDEX'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 8087;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'docs-engine', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Documentation Engine - Implementation coming soon!');
});

app.listen(port, () => {
  console.log(`Documentation Engine listening on port ${port}`);
});
INDEX

# Copy common files to all services
for service in metrics-collector alert-engine team-management docs-engine; do
  cp services/cicd-engine/tsconfig.json services/$service/
  cp services/cicd-engine/Dockerfile services/$service/
  # Update port in Dockerfile
  sed -i "s/8082/$(echo $service | sed 's/.*-//' | sed 's/collector/8084/' | sed 's/engine/8085/' | sed 's/management/8086/' | sed 's/docs/8087/')/" services/$service/Dockerfile 2>/dev/null || true
done

echo "Services created successfully!"
