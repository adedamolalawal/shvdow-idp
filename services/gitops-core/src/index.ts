import express from 'express';
import { simpleGit, SimpleGit } from 'simple-git';
import YAML from 'yaml';
import Joi from 'joi';
import winston from 'winston';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from 'redis';
import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import chokidar from 'chokidar';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gitops.log' })
  ]
});

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://idp_user:idp_password@localhost:5432/idp_db'
});

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect();

app.use(express.json());

// Git repository manager
class GitOpsManager {
  private reposPath: string;
  private git: SimpleGit;

  constructor() {
    this.reposPath = process.env.REPOS_PATH || '/app/repos';
    this.git = simpleGit();
    this.ensureReposDirectory();
  }

  private async ensureReposDirectory() {
    await fs.ensureDir(this.reposPath);
  }

  async cloneRepository(repoUrl: string, repoName: string, branch: string = 'main'): Promise<string> {
    const repoPath = path.join(this.reposPath, repoName);
    
    try {
      if (await fs.pathExists(repoPath)) {
        // Repository already exists, pull latest changes
        const repoGit = simpleGit(repoPath);
        await repoGit.pull('origin', branch);
        logger.info(`Updated repository: ${repoName}`);
      } else {
        // Clone repository
        await this.git.clone(repoUrl, repoPath, ['--branch', branch]);
        logger.info(`Cloned repository: ${repoName}`);
      }
      
      return repoPath;
    } catch (error) {
      logger.error(`Failed to clone/update repository ${repoName}:`, error);
      throw error;
    }
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    const repoGit = simpleGit(repoPath);
    
    try {
      await repoGit.checkoutLocalBranch(branchName);
      logger.info(`Created branch: ${branchName} in ${repoPath}`);
    } catch (error) {
      logger.error(`Failed to create branch ${branchName}:`, error);
      throw error;
    }
  }

  async commitAndPush(repoPath: string, message: string, files: string[]): Promise<string> {
    const repoGit = simpleGit(repoPath);
    
    try {
      await repoGit.add(files);
      const commit = await repoGit.commit(message);
      await repoGit.push('origin', 'HEAD');
      
      logger.info(`Committed and pushed changes: ${commit.commit}`);
      return commit.commit;
    } catch (error) {
      logger.error(`Failed to commit and push:`, error);
      throw error;
    }
  }

  async createPullRequest(repoName: string, sourceBranch: string, targetBranch: string, title: string, description: string): Promise<any> {
    // This would integrate with GitHub/GitLab API
    // For now, return a mock PR
    const prId = uuidv4();
    
    logger.info(`Created PR: ${title} from ${sourceBranch} to ${targetBranch}`);
    
    return {
      id: prId,
      title,
      description,
      sourceBranch,
      targetBranch,
      url: `https://github.com/example/${repoName}/pull/${prId}`
    };
  }
}

// Configuration template manager
class TemplateManager {
  private templatesPath: string;

  constructor() {
    this.templatesPath = process.env.TEMPLATES_PATH || '/app/templates';
    this.ensureTemplatesDirectory();
  }

  private async ensureTemplatesDirectory() {
    await fs.ensureDir(this.templatesPath);
    await this.createDefaultTemplates();
  }

  private async createDefaultTemplates() {
    const templates = {
      'deployment.yaml': `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{serviceName}}
  namespace: {{namespace}}
  labels:
    app: {{serviceName}}
    version: {{version}}
spec:
  replicas: {{replicas}}
  selector:
    matchLabels:
      app: {{serviceName}}
  template:
    metadata:
      labels:
        app: {{serviceName}}
        version: {{version}}
    spec:
      containers:
      - name: {{serviceName}}
        image: {{image}}:{{tag}}
        ports:
        - containerPort: {{port}}
        env:
        {{#each environment}}
        - name: {{@key}}
          value: "{{this}}"
        {{/each}}
        resources:
          requests:
            memory: "{{resources.requests.memory}}"
            cpu: "{{resources.requests.cpu}}"
          limits:
            memory: "{{resources.limits.memory}}"
            cpu: "{{resources.limits.cpu}}"
`,
      'service.yaml': `
apiVersion: v1
kind: Service
metadata:
  name: {{serviceName}}
  namespace: {{namespace}}
spec:
  selector:
    app: {{serviceName}}
  ports:
  - port: {{port}}
    targetPort: {{port}}
  type: {{serviceType}}
`,
      'pipeline.yaml': `
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: {{pipelineName}}
  namespace: {{namespace}}
spec:
  params:
  - name: git-url
    type: string
  - name: git-revision
    type: string
    default: main
  - name: image-name
    type: string
  tasks:
  - name: fetch-source
    taskRef:
      name: git-clone
    params:
    - name: url
      value: $(params.git-url)
    - name: revision
      value: $(params.git-revision)
  - name: build-image
    taskRef:
      name: buildah
    runAfter:
    - fetch-source
    params:
    - name: IMAGE
      value: $(params.image-name)
`
    };

    for (const [filename, content] of Object.entries(templates)) {
      const templatePath = path.join(this.templatesPath, filename);
      if (!(await fs.pathExists(templatePath))) {
        await fs.writeFile(templatePath, content.trim());
      }
    }
  }

  async renderTemplate(templateName: string, context: any): Promise<string> {
    const templatePath = path.join(this.templatesPath, templateName);
    
    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    
    return template(context);
  }

  async listTemplates(): Promise<string[]> {
    const files = await fs.readdir(this.templatesPath);
    return files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  }
}

const gitOpsManager = new GitOpsManager();
const templateManager = new TemplateManager();

// Validation schemas
const repositorySchema = Joi.object({
  name: Joi.string().required(),
  url: Joi.string().uri().required(),
  branch: Joi.string().default('main'),
  credentials: Joi.object({
    username: Joi.string(),
    token: Joi.string()
  }).optional()
});

const deploymentSchema = Joi.object({
  serviceName: Joi.string().required(),
  namespace: Joi.string().default('default'),
  image: Joi.string().required(),
  tag: Joi.string().default('latest'),
  replicas: Joi.number().integer().min(1).default(1),
  port: Joi.number().integer().min(1).max(65535).required(),
  environment: Joi.object().default({}),
  resources: Joi.object({
    requests: Joi.object({
      memory: Joi.string().default('128Mi'),
      cpu: Joi.string().default('100m')
    }),
    limits: Joi.object({
      memory: Joi.string().default('256Mi'),
      cpu: Joi.string().default('200m')
    })
  }).default({
    requests: { memory: '128Mi', cpu: '100m' },
    limits: { memory: '256Mi', cpu: '200m' }
  })
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'gitops-core'
  });
});

// Repository management endpoints
app.post('/repositories', async (req, res) => {
  try {
    const { error, value } = repositorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, url, branch } = value;
    
    // Store repository configuration in database
    const result = await db.query(
      'INSERT INTO repositories (name, url, branch, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, url, branch]
    );

    // Clone repository
    const repoPath = await gitOpsManager.cloneRepository(url, name, branch);

    res.status(201).json({
      repository: result.rows[0],
      path: repoPath
    });
  } catch (error) {
    logger.error('Failed to add repository:', error);
    res.status(500).json({ error: 'Failed to add repository' });
  }
});

app.get('/repositories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM repositories ORDER BY created_at DESC');
    res.json({ repositories: result.rows });
  } catch (error) {
    logger.error('Failed to fetch repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Deployment management endpoints
app.post('/deployments', async (req, res) => {
  try {
    const { error, value } = deploymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const deploymentConfig = value;
    const deploymentId = uuidv4();
    
    // Generate Kubernetes manifests
    const deploymentYaml = await templateManager.renderTemplate('deployment.yaml', deploymentConfig);
    const serviceYaml = await templateManager.renderTemplate('service.yaml', deploymentConfig);

    // Store deployment configuration
    await db.query(
      'INSERT INTO deployments (id, service_name, namespace, config, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [deploymentId, deploymentConfig.serviceName, deploymentConfig.namespace, JSON.stringify(deploymentConfig), 'pending']
    );

    // Create branch for deployment
    const branchName = `deploy/${deploymentConfig.serviceName}-${Date.now()}`;
    
    // This would typically write to a GitOps repository
    // For now, we'll simulate the process
    
    res.status(201).json({
      deploymentId,
      branchName,
      manifests: {
        deployment: deploymentYaml,
        service: serviceYaml
      },
      status: 'pending'
    });
  } catch (error) {
    logger.error('Failed to create deployment:', error);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

app.get('/deployments', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM deployments ORDER BY created_at DESC');
    res.json({ deployments: result.rows });
  } catch (error) {
    logger.error('Failed to fetch deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Template management endpoints
app.get('/templates', async (req, res) => {
  try {
    const templates = await templateManager.listTemplates();
    res.json({ templates });
  } catch (error) {
    logger.error('Failed to fetch templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.post('/templates/render', async (req, res) => {
  try {
    const { template, context } = req.body;
    
    if (!template || !context) {
      return res.status(400).json({ error: 'Template and context are required' });
    }

    const rendered = await templateManager.renderTemplate(template, context);
    res.json({ rendered });
  } catch (error) {
    logger.error('Failed to render template:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

// Sync job to monitor repositories
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Running repository sync job');
    
    const result = await db.query('SELECT * FROM repositories');
    
    for (const repo of result.rows) {
      try {
        await gitOpsManager.cloneRepository(repo.url, repo.name, repo.branch);
      } catch (error) {
        logger.error(`Failed to sync repository ${repo.name}:`, error);
      }
    }
  } catch (error) {
    logger.error('Repository sync job failed:', error);
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        url TEXT NOT NULL,
        branch VARCHAR(255) DEFAULT 'main',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id UUID PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        namespace VARCHAR(255) DEFAULT 'default',
        config JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    logger.info(`GitOps Core service running on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
