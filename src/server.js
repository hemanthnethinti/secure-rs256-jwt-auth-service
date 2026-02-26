require('dotenv').config();

const { ensureRequiredEnvironmentVariables, apiPort } = require('./config');

ensureRequiredEnvironmentVariables();

const app = require('./app');

app.listen(apiPort, () => {
  process.stdout.write(`Server running on port ${apiPort}\n`);
});
