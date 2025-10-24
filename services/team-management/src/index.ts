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
