// Import the web framework and the parts of this project used by the server.
import express from "express";
import { initializeDatabase } from "./data_access/dbConnection.js";
import bookRoutes from "./routes/bookRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

// Create the Express application and allow JSON request bodies.
const app = express();
const configuredPort = process.env.PORT;
const port = configuredPort === undefined ? 3000 : Number(configuredPort);
app.use(express.json());

// Send each group of URLs to its own router.
app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/loans", loanRoutes);

// Handle unknown URLs and errors after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

// Create the database tables before accepting requests.
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535.");
  process.exitCode = 1;
} else {
  initializeDatabase()
    .then(() => {
      const server = app.listen(port, () => {
        console.log(`Library API is running at http://localhost:${port}`);
      });
      server.on("error", (error) => {
        console.error("Could not start the server:", error.message);
        process.exitCode = 1;
      });
    })
    .catch((error) => {
      console.error("Could not start the server:", error.message);
      process.exitCode = 1;
    });
}
