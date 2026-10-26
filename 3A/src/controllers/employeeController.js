import employeeService from '../services/employeeService.js';

// Controllers connect employee HTTP endpoints to the employee services.
async function createEmployee(req, res) {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json({ message: 'Employee created successfully', data: employee });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create employee' });
  }
}

async function getAllEmployees(req, res) {
  try {
    const employees = await employeeService.getAllEmployees();
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
}

async function getEmployeeById(req, res) {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
}

async function searchEmployees(req, res) {
  try {
    const employees = await employeeService.searchEmployees(req.query);
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Failed to search employees' });
  }
}

async function updateEmployee(req, res) {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee updated successfully', data: employee });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update employee' });
  }
}

async function deleteEmployee(req, res) {
  try {
    const employee = await employeeService.deleteEmployee(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee deleted successfully', data: employee });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete employee' });
  }
}

async function getHeadcountByDepartment(req, res) {
  try {
    const report = await employeeService.getHeadcountByDepartment();
    res.status(200).json({ data: report });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch department headcount report' });
  }
}

async function getEmployeesOnLeaveToday(req, res) {
  try {
    const employees = await employeeService.getEmployeesOnLeaveToday();
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees on leave today' });
  }
}

async function getReportingHierarchy(req, res) {
  try {
    const hierarchy = await employeeService.getReportingHierarchy(req.params.id);
    res.status(200).json({ data: hierarchy });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reporting hierarchy' });
  }
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
