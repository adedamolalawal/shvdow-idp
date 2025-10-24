"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const simple_git_1 = require("simple-git");
const joi_1 = __importDefault(require("joi"));
const winston_1 = __importDefault(require("winston"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const redis_1 = require("redis");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const node_cron_1 = __importDefault(require("node-cron"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Logger setup
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/gitops.log' })
    ]
});
// Database connection
const db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://idp_user:idp_password@localhost:5432/idp_db'
});
// Redis client
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect();
app.use(express_1.default.json());
// Git repository manager
class GitOpsManager {
    constructor() {
        this.reposPath = process.env.REPOS_PATH || '/app/repos';
        this.git = (0, simple_git_1.simpleGit)();
        this.ensureReposDirectory();
    }
    async ensureReposDirectory() {
        await fs_extra_1.default.ensureDir(this.reposPath);
    }
    async cloneRepository(repoUrl, repoName, branch = 'main') {
        const repoPath = path_1.default.join(this.reposPath, repoName);
        try {
            if (await fs_extra_1.default.pathExists(repoPath)) {
                // Repository already exists, pull latest changes
                const repoGit = (0, simple_git_1.simpleGit)(repoPath);
                await repoGit.pull('origin', branch);
                logger.info(`Updated repository: ${repoName}`);
            }
            else {
                // Clone repository
                await this.git.clone(repoUrl, repoPath, ['--branch', branch]);
                logger.info(`Cloned repository: ${repoName}`);
            }
            return repoPath;
        }
        catch (error) {
            logger.error(`Failed to clone/update repository ${repoName}:`, error);
            throw error;
        }
    }
    async createBranch(repoPath, branchName) {
        const repoGit = (0, simple_git_1.simpleGit)(repoPath);
        try {
            await repoGit.checkoutLocalBranch(branchName);
            logger.info(`Created branch: ${branchName} in ${repoPath}`);
        }
        catch (error) {
            logger.error(`Failed to create branch ${branchName}:`, error);
            throw error;
        }
    }
    async commitAndPush(repoPath, message, files) {
        const repoGit = (0, simple_git_1.simpleGit)(repoPath);
        try {
            await repoGit.add(files);
            const commit = await repoGit.commit(message);
            await repoGit.push('origin', 'HEAD');
            logger.info(`Committed and pushed changes: ${commit.commit}`);
            return commit.commit;
        }
        catch (error) {
            logger.error(`Failed to commit and push:`, error);
            throw error;
        }
    }
    async createPullRequest(repoName, sourceBranch, targetBranch, title, description) {
        // This would integrate with GitHub/GitLab API
        // For now, return a mock PR
        const prId = (0, uuid_1.v4)();
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
    constructor() {
        this.templatesPath = process.env.TEMPLATES_PATH || '/app/templates';
        this.ensureTemplatesDirectory();
    }
    async ensureTemplatesDirectory() {
        await fs_extra_1.default.ensureDir(this.templatesPath);
        await this.createDefaultTemplates();
    }
    async createDefaultTemplates() {
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
            const templatePath = path_1.default.join(this.templatesPath, filename);
            if (!(await fs_extra_1.default.pathExists(templatePath))) {
                await fs_extra_1.default.writeFile(templatePath, content.trim());
            }
        }
    }
    async renderTemplate(templateName, context) {
        const templatePath = path_1.default.join(this.templatesPath, templateName);
        if (!(await fs_extra_1.default.pathExists(templatePath))) {
            throw new Error(`Template not found: ${templateName}`);
        }
        const templateContent = await fs_extra_1.default.readFile(templatePath, 'utf-8');
        const template = handlebars_1.default.compile(templateContent);
        return template(context);
    }
    async listTemplates() {
        const files = await fs_extra_1.default.readdir(this.templatesPath);
        return files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    }
}
const gitOpsManager = new GitOpsManager();
const templateManager = new TemplateManager();
// Validation schemas
const repositorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    url: joi_1.default.string().uri().required(),
    branch: joi_1.default.string().default('main'),
    credentials: joi_1.default.object({
        username: joi_1.default.string(),
        token: joi_1.default.string()
    }).optional()
});
const deploymentSchema = joi_1.default.object({
    serviceName: joi_1.default.string().required(),
    namespace: joi_1.default.string().default('default'),
    image: joi_1.default.string().required(),
    tag: joi_1.default.string().default('latest'),
    replicas: joi_1.default.number().integer().min(1).default(1),
    port: joi_1.default.number().integer().min(1).max(65535).required(),
    environment: joi_1.default.object().default({}),
    resources: joi_1.default.object({
        requests: joi_1.default.object({
            memory: joi_1.default.string().default('128Mi'),
            cpu: joi_1.default.string().default('100m')
        }),
        limits: joi_1.default.object({
            memory: joi_1.default.string().default('256Mi'),
            cpu: joi_1.default.string().default('200m')
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
        const result = await db.query('INSERT INTO repositories (name, url, branch, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *', [name, url, branch]);
        // Clone repository
        const repoPath = await gitOpsManager.cloneRepository(url, name, branch);
        res.status(201).json({
            repository: result.rows[0],
            path: repoPath
        });
    }
    catch (error) {
        logger.error('Failed to add repository:', error);
        res.status(500).json({ error: 'Failed to add repository' });
    }
});
app.get('/repositories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM repositories ORDER BY created_at DESC');
        res.json({ repositories: result.rows });
    }
    catch (error) {
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
        const deploymentId = (0, uuid_1.v4)();
        // Generate Kubernetes manifests
        const deploymentYaml = await templateManager.renderTemplate('deployment.yaml', deploymentConfig);
        const serviceYaml = await templateManager.renderTemplate('service.yaml', deploymentConfig);
        // Store deployment configuration
        await db.query('INSERT INTO deployments (id, service_name, namespace, config, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())', [deploymentId, deploymentConfig.serviceName, deploymentConfig.namespace, JSON.stringify(deploymentConfig), 'pending']);
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
    }
    catch (error) {
        logger.error('Failed to create deployment:', error);
        res.status(500).json({ error: 'Failed to create deployment' });
    }
});
app.get('/deployments', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM deployments ORDER BY created_at DESC');
        res.json({ deployments: result.rows });
    }
    catch (error) {
        logger.error('Failed to fetch deployments:', error);
        res.status(500).json({ error: 'Failed to fetch deployments' });
    }
});
// Template management endpoints
app.get('/templates', async (req, res) => {
    try {
        const templates = await templateManager.listTemplates();
        res.json({ templates });
    }
    catch (error) {
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
    }
    catch (error) {
        logger.error('Failed to render template:', error);
        res.status(500).json({ error: 'Failed to render template' });
    }
});
// Sync job to monitor repositories
node_cron_1.default.schedule('*/5 * * * *', async () => {
    try {
        logger.info('Running repository sync job');
        const result = await db.query('SELECT * FROM repositories');
        for (const repo of result.rows) {
            try {
                await gitOpsManager.cloneRepository(repo.url, repo.name, repo.branch);
            }
            catch (error) {
                logger.error(`Failed to sync repository ${repo.name}:`, error);
            }
        }
    }
    catch (error) {
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
    }
    catch (error) {
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
exports.default = app;
//# sourceMappingURL=index.js.map