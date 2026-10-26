import express from 'express';
import env from './src/config/env.js';
import departmentRoutes from './src/routes/departmentRoutes.js';
import employeeRoutes from './src/routes/employeeRoutes.js';
import leaveRoutes from './src/routes/leaveRoutes.js';

// Create the Express app and enable JSON request bodies.
const app = express();

app.use(express.json());

// A small root page confirms the API is running and lists its main route groups.
app.get('/', (req, res) => {
  res.json({
    message: 'Employee Leave Management API is running',
    endpoints: {
      departments: '/api/departments',
      employees: '/api/employees',
      leaves: '/api/leaves'
    }
  });
});

app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);

// Return a JSON error instead of leaving a failed request without a response.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    message: error.message || 'Internal server error'
  });
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
