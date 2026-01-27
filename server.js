const express = require('express');
const path = require('path');

const app = express();
const PORT = 3003;
const BASE_PATH = '/HL7';

// Serve static files from public directory at base path
app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));

// Redirect root to base path
app.get('/', (req, res) => {
  res.redirect(BASE_PATH + '/');
});

// Redirect base path without trailing slash
app.get(BASE_PATH, (req, res) => {
  res.redirect(BASE_PATH + '/');
});

app.listen(PORT, () => {
  console.log(`HL7 Viewer running at http://localhost:${PORT}${BASE_PATH}/`);
});
