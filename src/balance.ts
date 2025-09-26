import express, { Router, Request, Response } from "express";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { ddbClient } from "./dynamo";
import { getUserById } from "./transaction";

// Health check function
export async function healthCheck(): Promise<{ status: string; message?: string }> {
  try {
    await ddbClient.send(new ListTablesCommand({ Limit: 1 }));
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: "DynamoDB not reachable" };
  }
}

// Balance management functions
export async function getUserBalance(userId: string): Promise<{ balance: number; currency: string } | null> {
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }
  return {
    balance: user.balance,
    currency: user.currency,
  };
}

// Router setup for health and balance endpoints
export function createBalanceRouter(): Router {
  const router = Router();

  // Health endpoint
  router.get("/health", async (_req: Request, res: Response) => {
    const result = await healthCheck();
    const statusCode = result.status === "ok" ? 200 : 500;
    return res.status(statusCode).json(result);
  });

  // Get user balance endpoint
  router.get("/users/:userId/balance", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params as { userId: string };
      const balance = await getUserBalance(userId);
      
      if (!balance) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      return res.status(200).json({ 
        status: "ok", 
        data: balance 
      });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  return router;
}
