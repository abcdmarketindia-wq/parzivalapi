const path = require('node:path');
const express = require('express');

const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const lookupRoutes = require('./routes/lookupRoutes');

const app = express();
app.disable('x-powered-by');
// Behind nginx on the same machine, every request arrives from 127.0.0.1. Trusting the
// local proxy's X-Forwarded-For gives each visitor their own IP, so the login rate limit
// applies per visitor instead of to everyone at once. Only loopback is trusted, so
// visitors can't fake their IP by sending the header themselves.
app.set('trust proxy', 'loopback');

app.use('/api', cors);
app.use(express.json({ limit: '10kb' }));

app.use('/api', apiRoutes);
app.use('/v1', lookupRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.use(errorHandler);

module.exports = app;
