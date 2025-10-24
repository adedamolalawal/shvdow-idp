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
