import express from "express";
import TransactionsController  from "./controllers/transactions.controllers";
import HealthController from "./controllers/health.controllers";

const app = express();
const PORT = 8081;

app.use(express.json());
app.use("/transactions", TransactionsController.router);
app.use("/", HealthController.router);

app.get("/", (_req, res) => {
  res.send({ status: "ok", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


