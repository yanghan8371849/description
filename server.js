import express from 'express';
import dotenv from 'dotenv';
import generateDefinitionHandler from './api/generate-definition.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// API Routes
app.post('/api/generate-definition', (req, res) => {
  generateDefinitionHandler(req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
