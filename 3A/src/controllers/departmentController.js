import departmentService from '../services/departmentService.js';

// Controllers read request data, call services, and send HTTP responses.
async function createDepartment(req, res) {
  try {
    const department = await departmentService.createDepartment(req.body.name);
    res.status(201).json({ message: 'Department created successfully', data: department });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create department' });
  }
}

async function getAllDepartments(req, res) {
  try {
    const departments = await departmentService.getAllDepartments();
    res.status(200).json({ data: departments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
}

async function getDepartmentById(req, res) {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.status(200).json({ data: department });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch department' });
  }
}

async function updateDepartment(req, res) {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body.name);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.status(200).json({ message: 'Department updated successfully', data: department });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update department' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const department = await departmentService.deleteDepartment(req.params.id);
    res.status(200).json({ message: 'Department deleted successfully', data: department });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to delete department' });
  }
}

export default {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
