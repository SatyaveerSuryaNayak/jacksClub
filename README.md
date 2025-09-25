# Jack's Club API

## Prerequisites

- Node.js (v14 or higher)
- Docker (for DynamoDB Local)
- npm

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start DynamoDB Local**
   ```bash
   docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local:latest
   ```

3. **Create database tables**
   ```bash
   npm run db:create:users
   npm run db:create:transactions
   ```

4. **Seed a user**
   ```bash
   npm run seed:user
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:8081`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:create:users` - Create Users table in DynamoDB
- `npm run db:create:transactions` - Create Transactions table in DynamoDB
- `npm run seed:user` - Seed a test user (satyaveer)

## API Endpoints

### Health Check
```bash
GET /health
```
Returns server health status and DynamoDB connection status.

**Response:**
```json
{
  "status": "ok"
}
```

### User Management

#### Get User Details with balance info
```bash
GET /transactions/users/:userId
```

**Parameters:**
- `userId` (path): User ID in format `u_*` (e.g., `u_satyaveer`)

**Example:**
```bash
curl http://localhost:8081/transactions/users/u_satyaveer
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "id": "u_satyaveer",
    "name": "satyaveer",
    "email": "nayaksatyaveer@gmail.com",
    "balance": 250,
    "currency": "INR"
  }
}
```

### Transaction Management

#### Process Transaction
```bash
POST /transactions/transact
```

**Request Body:**
```json
{
  "idempotentKey": "unique_key_123",
  "userId": "u_satyaveer",
  "amount": 100,
  "type": "credit"
}
```

**Parameters:**
- `idempotentKey` (string): Unique key to prevent duplicate transactions
- `userId` (string): User ID in format `u_*`
- `amount` (number): Transaction amount (must be > 0)
- `type` (string): Either "credit" or "debit"

**Examples:**

Credit transaction:
```bash
curl -X POST http://localhost:8081/transactions/transact \
  -H "Content-Type: application/json" \
  -d '{"idempotentKey":"credit_1","userId":"u_satyaveer","amount":100,"type":"credit"}'
```

Debit transaction:
```bash
curl -X POST http://localhost:8081/transactions/transact \
  -H "Content-Type: application/json" \
  -d '{"idempotentKey":"debit_1","userId":"u_satyaveer","amount":50,"type":"debit"}'
```

**Response (Success):**
```json
{
  "status": "ok",
  "data": {
    "transactionId": "uuid-here",
    "newBalance": 150,
    "message": "Transaction processed successfully"
  }
}
```

**Response (Duplicate):**
```json
{
  "status": "ok",
  "data": {
    "transactionId": "uuid-here",
    "newBalance": 150,
    "message": "Transaction already processed",
    "existingTransaction": { ... }
  }
}
```

**Response (Insufficient Balance):**
```json
{
  "status": "error",
  "message": "Insufficient balance"
}
```

#### Get User Transactions
```bash
GET /transactions/users/:userId/transactions
```

**Query Parameters:**
- `limit` (optional): Number of transactions to return (1-100, default: 20)
- `nextToken` (optional): Pagination token for next page

**Example:**
```bash
curl "http://localhost:8081/transactions/users/u_satyaveer/transactions?limit=10"
```

**Response:**
```json
{
  "status": "ok",
  "items": [
    {
      "id": "uuid-here",
      "userId": "u_satyaveer",
      "txnType": "CREDIT",
      "status": "SUCCED",
      "amount": 100,
      "idempotentKey": "credit_1"
    }
  ],
  "nextToken": "base64-encoded-token"
}
```

#### Initialize Credit/Debit (Legacy)
```bash
POST /transactions/initCrDr
```

**Request Body:**
```json
{
  "type": "CR",
  "userId": "u_satyaveer",
  "amount": 100,
  "accountNumber": "1234567890",
  "ifsc": "HDFC0001234"
}
```

**Note:** This endpoint is for initialization only. Use `/transact` for actual transaction processing.

## Features

- **Idempotency**: Prevents duplicate transactions using idempotent keys
- **Balance Validation**: Ensures balance cannot go below 0
- **Race Condition Prevention**: Uses DynamoDB conditional writes
- **User Validation**: Validates user exists before processing
- **Pagination**: Supports paginated transaction listing
- **Input Validation**: Joi validation for all inputs
- **Type Safety**: Full TypeScript support

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common error scenarios:
- User not found
- Insufficient balance
- Invalid input format
- Duplicate transaction (idempotent key)
- Server errors

## Database Schema

### Users Table
- `pk`: `USER#{userId}`
- `sk`: `USER#{userId}`
- Fields: `id`, `name`, `email`, `balance`, `currency`

### Transactions Table
- `pk`: `USER#{userId}` or `IDEMPOTENT#{idempotentKey}`
- `sk`: `TXN#{transactionId}` or `IDEMPOTENT#{idempotentKey}`
- Fields: `id`, `userId`, `txnType`, `status`, `amount`, `idempotentKey`
