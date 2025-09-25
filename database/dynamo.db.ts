import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


export const ddbClient = new DynamoDBClient({
  region: "us-west-2", // required
  endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000", // local fallback
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fakeMyKeyId",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fakeSecretAccessKey",
  },
});

export const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

