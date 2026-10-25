const express = require("express");
const router = express.Router();

const {
    getDepartmentHeadcount,
    getEmployeesOnLeaveToday,
    getReportingHierarchy
} = require("../controllers/reportController");

router.get("/department-headcount", getDepartmentHeadcount);
router.get("/employees-on-leave-today", getEmployeesOnLeaveToday);
router.get("/hierarchy/:id", getReportingHierarchy);

module.exports = router;