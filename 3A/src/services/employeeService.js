import pool from '../config/db.js';
import employeeQueries from '../queries/employeeQueries.js';

// Employee services coordinate database queries used by the employee API.
async function createEmployee(employeeData) {
  const { name, department_id, manager_id, joining_date, leave_balance } = employeeData;

  const result = await pool.query(employeeQueries.createEmployee, [
    name,
    department_id,
    manager_id || null,
    joining_date,
    leave_balance || 0
  ]);

  return result.rows[0];
}

async function getAllEmployees() {
  const result = await pool.query(employeeQueries.getAllEmployees);
  return result.rows;
}

async function getEmployeeById(id) {
  const result = await pool.query(employeeQueries.getEmployeeById, [id]);
  return result.rows[0];
}

async function searchEmployees(filters) {
  const {
    name = null,
    department_id = null,
    start_date = null,
    end_date = null
  } = filters;

  const result = await pool.query(employeeQueries.searchEmployees, [
    name,
    department_id ? Number(department_id) : null,
    start_date || null,
    end_date || null
  ]);

  return result.rows;
}

async function updateEmployee(id, employeeData) {
  const { name, department_id, manager_id, joining_date, leave_balance } = employeeData;

  const result = await pool.query(employeeQueries.updateEmployee, [
    name,
    department_id,
    manager_id || null,
    joining_date,
    leave_balance || 0,
    id
  ]);

  return result.rows[0];
}

async function deleteEmployee(id) {
  const result = await pool.query(employeeQueries.deleteEmployee, [id]);
  return result.rows[0];
}

async function getHeadcountByDepartment() {
  const result = await pool.query(employeeQueries.getHeadcountByDepartment);
  return result.rows;
}

async function getEmployeesOnLeaveToday() {
  const result = await pool.query(employeeQueries.getEmployeesOnLeaveToday);
  return result.rows;
}

async function getReportingHierarchy(employeeId) {
  const result = await pool.query(employeeQueries.getReportingHierarchy, [employeeId]);
  return result.rows;
}

export default {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  searchEmployees,
  updateEmployee,
  deleteEmployee,
  getHeadcountByDepartment,
  getEmployeesOnLeaveToday,
  getReportingHierarchy
};
