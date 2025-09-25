import { Router, Request, Response } from "express";
import { ddbClient } from "../database/dynamo.db";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";

export class HealthController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/health", this.health);
  }

  private health = async (_req: Request, res: Response): Promise<Response> => {
    try {
      await ddbClient.send(new ListTablesCommand({ Limit: 1 }));
      return res.status(200).json({ status: "ok" });
    } catch (_error) {
      return res.status(500).json({ status: "error", message: "DynamoDB not reachable" });
    }
  };
}

const healthController = new HealthController();
export default healthController;


