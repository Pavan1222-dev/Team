const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const bookRoutes = require('./routes/bookRoutes');
const memberRoutes = require('./routes/memberRoutes');
const loanRoutes = require('./routes/loanRoutes');

const app = express();
app.use(express.json());
app.use('/books', bookRoutes);
app.use('/members', memberRoutes);
app.use('/loans', loanRoutes);
app.use(errorHandler);
const PORT = 3000;
app.listen(PORT, function() {
  console.log(`Library API is running on http://localhost:${PORT}`);
});