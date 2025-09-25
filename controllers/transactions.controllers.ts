import { Router, Request, Response } from "express";
import { ddbClient } from "../database/dynamo.db";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { transactionRepository } from "../repositories/transaction.repository";
import { initTxnSchema, InitTxnInput } from "../validators/transaction.validator";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { getUserTxnsParamsSchema, getUserTxnsQuerySchema, getUserParamsSchema, transactSchema, TransactInput } from "../validators/transaction.validator";
import { userRepository } from "../repositories/user.repository";
import { transactionService } from "../services/transaction.service";

export class TransactionsController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/initCrDr", validateBody(initTxnSchema), this.initCrDr);
    this.router.post("/transact", validateBody(transactSchema), this.transact);
    this.router.get(
      "/users/:userId/transactions",
      validateParams(getUserTxnsParamsSchema),
      validateQuery(getUserTxnsQuerySchema),
      this.getUserTransactions
    );
    this.router.get("/users/:userId", validateParams(getUserParamsSchema), this.getUser);
  }

  private initCrDr = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { userId, amount, type, accountNumber, ifsc } = req.body as InitTxnInput;

      return res.status(200).json({
        status: "ok",
        action: "initCrDr",
        data: { userId, amount, type, accountNumber, ifsc },
      });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  };

  private getUserTransactions = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { userId } = req.params as { userId: string };
      const validatedQuery = (req as any).validatedQuery;
      const limit = validatedQuery.limit || 20;
      const nextToken = validatedQuery.nextToken;

      if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
        return res.status(400).json({ status: "error", message: "limit must be 1-100" });
      }

      const result = await transactionRepository.listByUserPaginated(userId, limit, nextToken);
      return res.status(200).json({ status: "ok", ...result });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  };

  private getUser = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await userRepository.getById(userId);
      
      if (!user) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      return res.status(200).json({ status: "ok", data: user });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  };

  private transact = async (req: Request, res: Response): Promise<Response> => {
    try {
      const input = req.body as TransactInput;
      const result = await transactionService.transact(input);

      if (result.success) {
        return res.status(200).json({
          status: "ok",
          data: {
            transactionId: result.transactionId,
            newBalance: result.newBalance,
            message: result.message,
            existingTransaction: result.existingTransaction,
          },
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Transaction error:", error);
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  };
}

export default new TransactionsController();


