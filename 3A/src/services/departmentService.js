import pool from '../config/db.js';
import departmentQueries from '../queries/departmentQueries.js';

// Service functions run department SQL and apply department-specific rules.
async function createDepartment(name) {
  const result = await pool.query(departmentQueries.createDepartment, [name]);
  return result.rows[0];
}

async function getAllDepartments() {
  const result = await pool.query(departmentQueries.getAllDepartments);
  return result.rows;
}

async function getDepartmentById(id) {
  const result = await pool.query(departmentQueries.getDepartmentById, [id]);
  return result.rows[0];
}

async function updateDepartment(id, name) {
  const result = await pool.query(departmentQueries.updateDepartment, [name, id]);
  return result.rows[0];
}

async function deleteDepartment(id) {
  const countResult = await pool.query(departmentQueries.countEmployeesInDepartment, [id]);
  const totalEmployees = Number(countResult.rows[0].total);

  // Keep departments with employees so their records are not accidentally orphaned.
  if (totalEmployees > 0) {
    const error = new Error('Cannot delete department because employees are assigned to it.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(departmentQueries.deleteDepartment, [id]);
  return result.rows[0];
}

export default {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
