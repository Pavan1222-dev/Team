
const express = require("express");
const db = require("./database/db");
const errorHandler = require("./middleware/errorHandler");
const app = express();

app.use(express.json());
//book
const bookRoutes = require("./routes/bookRoutes");

app.use("/api/books", bookRoutes);
//member
const memberRoutes = require("./routes/memberRoutes");

app.use("/api/members", memberRoutes);

const loanRoutes = require("./routes/loanRoutes");

app.use("/api/loans", loanRoutes);

app.use(errorHandler);

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
