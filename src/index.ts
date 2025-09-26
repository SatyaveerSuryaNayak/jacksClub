import express from "express";
import { createTransactionRouter } from "./transaction";
import { createBalanceRouter } from "./balance";

const app = express();
const PORT = 8081;

app.use(express.json());

// Routes
app.use("/transactions", createTransactionRouter());
app.use("/", createBalanceRouter());

// Root endpoint (this should come after the routers)
app.get("/", (_req, res) => {
  res.send({ status: "ok", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
