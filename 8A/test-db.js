const db = require("./db");

const sales = db.prepare(
    "SELECT * FROM sales"
).all();

const tasks = db.prepare(
    "SELECT * FROM tasks"
).all();

console.log("Sales:", sales);
console.log("Tasks:", tasks);

db.close();