const express = require('express');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { healthcheck } = require('./db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await healthcheck();
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return res.status(503).json({ status: 'unhealthy' });
  }
});

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
