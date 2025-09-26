# Jack's Club API

A TypeScript-based transaction and balance management system built with Express.js and DynamoDB.

## Prerequisites

- Node.js (v14 or higher)
- Docker (for DynamoDB Local)
- npm

## Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Start DynamoDB Local (Docker)

**Option A: Using Docker Compose (Recommended)**
```bash
cd docker-compose
docker-compose up -d
```

**Option B: Using Docker directly**
```bash
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local:latest
```

### 3. Start Development Server
```bash
npm run dev
```

Server will start on `http://localhost:8081`

### 4. Create Test User (Optional)
```bash
curl -X POST http://localhost:8081/transactions/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"u_testuser","name":"Test User","email":"test@example.com","initialBalance":1000,"currency":"INR"}'
```

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | System health check |
| `GET` | `/users/:userId/balance` | Get user balance |
| `POST` | `/transactions/users` | Create new user |
| `GET` | `/transactions/users/:userId` | Get user details |
| `POST` | `/transactions/transact` | Process transaction |
| `GET` | `/transactions/users/:userId/transactions` | Get transaction history |

## Testing Endpoints

### Health Check
```bash
curl http://localhost:8081/health
```
**Response:**
```json
{"status":"ok"}
```

### Get User Balance
```bash
curl http://localhost:8081/users/u_satyaveer/balance
```
**Response:**
```json
{
  "status": "ok",
  "data": {
    "balance": 250,
    "currency": "INR"
  }
}
```

### Create New User
```bash
curl -X POST http://localhost:8081/transactions/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"u_newuser","name":"New User","email":"newuser@example.com","initialBalance":500,"currency":"INR"}'
```
**Response:**
```json
{
  "status": "ok",
  "message": "User created successfully",
  "data": {
    "id": "u_newuser",
    "name": "New User",
    "email": "newuser@example.com",
    "balance": 500,
    "currency": "INR"
  }
}
```

### Get User Details
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

### Process Credit Transaction
```bash
curl -X POST http://localhost:8081/transactions/transact \
  -H "Content-Type: application/json" \
  -d '{"idempotentKey":"credit_1","userId":"u_satyaveer","amount":100,"type":"credit"}'
```
**Response:**
```json
{
  "status": "ok",
  "data": {
    "transactionId": "uuid-here",
    "newBalance": 350,
    "message": "Transaction processed successfully"
  }
}
```

### Process Debit Transaction
```bash
curl -X POST http://localhost:8081/transactions/transact \
  -H "Content-Type: application/json" \
  -d '{"idempotentKey":"debit_1","userId":"u_satyaveer","amount":50,"type":"debit"}'
```
**Response:**
```json
{
  "status": "ok",
  "data": {
    "transactionId": "uuid-here",
    "newBalance": 300,
    "message": "Transaction processed successfully"
  }
}
```

### Get Transaction History
```bash
curl "http://localhost:8081/transactions/users/u_satyaveer/transactions?limit=5"
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
      "status": "SUCCED"
    }
  ],
  "nextToken": "base64-token"
}
```


## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run automated API tests

## Running Tests

To run the automated test suite:

```bash
# Make sure server is running first
npm run dev

# In another terminal, run tests
npm test
```

The test suite will:
- ✅ Check all API endpoints
- ✅ Test user creation and management
- ✅ Test transaction processing 
- ✅ Verify error handling
- ✅ Test validation rules

## Docker Commands

```bash
# Start DynamoDB with docker-compose
cd docker-compose
docker-compose up -d

# Stop DynamoDB
docker-compose down

# View DynamoDB logs
docker-compose logs -f

# Restart DynamoDB
docker-compose restart
```