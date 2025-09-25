import { User, CurrencyCode } from "./user.model";

export type NewUserParams = {
  id: string;
  name: string;
  email: string;
  balance?: number;
  currency?: CurrencyCode;
};

function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

export function validateNewUserParams(params: NewUserParams): void {
  if (!params.id || params.id.trim().length === 0) {
    throw new Error("id is required");
  }
  if (!params.name || params.name.trim().length === 0) {
    throw new Error("name is required");
  }
  if (!params.email || !isValidEmail(params.email)) {
    throw new Error("valid email is required");
  }
  if (params.balance !== undefined && typeof params.balance !== "number") {
    throw new Error("balance must be a number");
  }
}

export function buildUser(params: NewUserParams): User {
  validateNewUserParams(params);
  return new User({
    id: params.id,
    name: params.name,
    email: params.email.toLowerCase(),
    balance: params.balance ?? 0,
    currency: params.currency ?? "USD",
  });
}


