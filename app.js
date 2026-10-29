const path = require('path');
const express = require('express');
const config = require('./config');
const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const notFound = require('./middlewares/notFound');

const app = express();

// Pengaturan view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Logger dipasang paling atas agar semua request tercatat
app.use(requestLogger);

// Semua route aplikasi
app.use(routes);

// Middleware 404 dipasang paling bawah
app.use(notFound);

app.listen(config.port, () => {
  console.log(`Server berjalan di http://localhost:${config.port}`);
});
