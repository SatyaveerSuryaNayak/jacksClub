import { BaseModel } from "./base.model";

export type TransactionType = "CREDIT" | "DEBIT";
export type TransactionStatus = "INITIATED" | "PROCESSING" | "FAILED" | "SUCCED";

export class Transaction extends BaseModel {
  public userId: string;
  public txnType: TransactionType;
  public status: TransactionStatus;
  public externalTxnId?: string;
  public accountNumber?: string;
  public ifsc?: string;
  public idempotentKey?: string;
  public amount?: number;

  constructor(params: {
    id: string;
    userId: string;
    txnType: TransactionType;
    status: TransactionStatus;
    externalTxnId?: string;
    accountNumber?: string;
    ifsc?: string;
    idempotentKey?: string;
    amount?: number;
  }) {
    super(params.id);
    this.userId = params.userId;
    this.txnType = params.txnType;
    this.status = params.status;
    this.externalTxnId = params.externalTxnId;
    this.accountNumber = params.accountNumber;
    this.ifsc = params.ifsc;
    this.idempotentKey = params.idempotentKey;
    this.amount = params.amount;
  }
}


