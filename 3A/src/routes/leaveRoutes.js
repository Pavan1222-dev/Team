
const express = require("express");
const router = express.Router();

const {
    applyLeave,
    getLeaveRequests,
    reviewLeave
} = require("../controllers/leaveController");

router.post("/", applyLeave);
router.get("/", getLeaveRequests);
router.patch("/:id/review", reviewLeave);

module.exports = router;
