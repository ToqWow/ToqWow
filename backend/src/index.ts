import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'toqwow-backend', version: '0.1.0' });
});

app.get('/', (req, res) => {
  res.json({ message: 'ToqWow API running' });
});

app.listen(PORT, () => {
  console.log(`ToqWow backend running on port ${PORT}`);
});
