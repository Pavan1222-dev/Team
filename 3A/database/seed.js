import pool from "../src/config/db.js";

// These departments and employees are simple sample data for trying the API.
const seedDepartments = ["Engineering", "Human Resources", "Finance", "Sales", "Support"];

const seedEmployees = [
  ["Alice Johnson", 1, null, "2020-01-15", 18],
  ["Bob Smith", 1, 1, "2021-02-10", 15],
  ["Charlie Brown", 1, 1, "2022-03-14", 12],
  ["Diana Wilson", 1, 2, "2023-04-20", 10],
  ["Ethan Davis", 2, null, "2019-11-05", 20],
  ["Fiona Miller", 2, 5, "2021-06-18", 14],
  ["George Moore", 2, 5, "2022-07-22", 13],
  ["Hannah Taylor", 3, null, "2018-09-12", 22],
  ["Isaac Anderson", 3, 9, "2020-08-11", 16],
  ["Julia Thomas", 3, 9, "2023-01-09", 9],
  ["Kevin Jackson", 4, null, "2021-04-10", 17],
  ["Laura White", 4, 11, "2022-05-11", 11],
  ["Michael Harris", 4, 11, "2023-06-13", 8],
  ["Nina Martin", 5, null, "2020-10-02", 19],
  ["Oliver Thompson", 5, 14, "2021-12-07", 12],
  ["Priya Kumar", 1, 2, "2022-08-19", 14],
  ["Quinn Lee", 1, 2, "2023-09-24", 10],
  ["Rachel Green", 2, 5, "2020-03-31", 21],
  ["Samuel Clark", 3, 9, "2021-05-17", 15],
  ["Tina Adams", 4, 11, "2019-12-06", 18],
  ["Uma Patel", 5, 14, "2022-02-02", 13],
  ["Victor Scott", 1, 1, "2023-10-16", 9],
  ["Wendy Hall", 2, 5, "2022-11-21", 10],
  ["Xavier Young", 3, 9, "2021-07-12", 14],
  ["Yara Lewis", 4, 11, "2020-08-29", 17],
  ["Zachary Walker", 5, 14, "2023-03-18", 11],
  ["Ava Robinson", 1, 2, "2022-04-20", 12],
  ["Benjamin Hall", 2, 5, "2021-10-14", 13],
  ["Chloe Allen", 3, 9, "2023-11-08", 8],
  ["Daniel King", 4, 11, "2020-01-09", 18],
  ["Ella Wright", 5, 14, "2022-06-15", 12],
  ["Frank Scott", 1, 2, "2019-02-22", 20],
  ["Grace Lewis", 2, 5, "2023-07-11", 10],
  ["Henry Green", 3, 9, "2021-09-19", 15],
  ["Ivy Baker", 4, 11, "2022-02-28", 9],
  ["Jack Nelson", 5, 14, "2020-05-27", 18],
  ["Karen Perez", 1, 1, "2021-11-03", 12],
  ["Leo Roberts", 2, 5, "2023-08-25", 11],
  ["Mia Collins", 3, 9, "2020-12-01", 16],
  ["Noah Stewart", 4, 11, "2022-03-14", 10],
  ["Olivia Rogers", 5, 14, "2021-06-03", 13],
  ["Paul Reed", 1, 2, "2023-01-27", 8],
  ["Quincy Turner", 2, 5, "2020-07-21", 20],
  ["Ruby Phillips", 3, 9, "2022-09-12", 12],
  ["Sofia Campbell", 4, 11, "2021-04-17", 14],
  ["Theo Parker", 5, 14, "2023-05-24", 11],
  ["Uma Flores", 1, 2, "2019-08-09", 19],
  ["Violet Murphy", 2, 5, "2022-10-18", 9],
  ["Wesley Ross", 3, 9, "2020-03-07", 17],
  ["Xena Brooks", 4, 11, "2021-12-11", 10],
  ["Yusuf Cooper", 5, 14, "2023-09-03", 8],
  ["Zoe Powell", 1, 1, "2020-11-20", 15],
  ["Aaron Russell", 2, 5, "2021-03-17", 13],
  ["Bella Foster", 3, 9, "2022-07-30", 11],
  ["Caleb Brooks", 4, 11, "2023-12-12", 7]
];

async function seedDatabase() {
  try {
    await pool.query("TRUNCATE TABLE leave_requests, employees, departments RESTART IDENTITY CASCADE");

    for (const department of seedDepartments) {
      await pool.query("INSERT INTO departments (name) VALUES ($1)", [department]);
    }

    for (const employee of seedEmployees) {
      await pool.query("INSERT INTO employees (name, department_id, manager_id, joining_date, leave_balance) VALUES ($1, $2, $3, $4, $5)", employee);
    }

    console.log("Database seeded with departments and employees.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDatabase();
