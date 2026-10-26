const express = require("express");
const app = express();

app.use(express.json());
app.use(require("./routes/departments"));
app.use(require("./routes/employees"));
app.use(require("./routes/leaves"));
app.use(require("./routes/reports"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Employee Management API running on http://localhost:${PORT}`);
});
