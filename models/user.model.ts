import { BaseModel } from "./base.model";

export type CurrencyCode = "USD" | "EUR" | "INR" | "GBP" | "JPY" | string;

export class User extends BaseModel {
  public name: string;
  public email: string;
  public balance: number;
  public currency: CurrencyCode;

  constructor(params: { id: string; name: string; email: string; balance: number; currency: CurrencyCode }) {
    super(params.id);
    this.name = params.name;
    this.email = params.email;
    this.balance = params.balance;
    this.currency = params.currency;
  }
}


