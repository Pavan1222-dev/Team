// Import the web framework and the parts of this project used by the server.
import express from "express";
import { initializeDatabase } from "./data_access/dbConnection.js";
import bookRoutes from "./routes/bookRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

// Create the Express application and allow JSON request bodies.
const app = express();
app.use(express.json());

// Send each group of URLs to its own router.
app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/loans", loanRoutes);

// Handle unknown URLs and errors after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

// Create the database tables before accepting requests.
initializeDatabase()
  .then(() => {
    app.listen(3000, () => {
      console.log("Library API is running at http://localhost:3000");
    });
  })
  .catch((error) => {
    console.error("Could not start the server:", error.message);
  });
