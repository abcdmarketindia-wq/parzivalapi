const path = require('node:path');
const express = require('express');

const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const lookupRoutes = require('./routes/lookupRoutes');

const app = express();
app.disable('x-powered-by');

app.use('/api', cors);
app.use(express.json({ limit: '10kb' }));

app.use('/api', apiRoutes);
app.use('/v1', lookupRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.use(errorHandler);

module.exports = app;
