import Joi from "joi";

export const initTxnSchema = Joi.object({
  type: Joi.string().valid("CR", "DR").required(),
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
  amount: Joi.number().greater(0).required(),
  accountNumber: Joi.when("type", {
    is: "DR",
    then: Joi.string().trim().required(),
    otherwise: Joi.forbidden(),
  }),
  ifsc: Joi.when("type", {
    is: "DR",
    then: Joi.string().trim().required(),
    otherwise: Joi.forbidden(),
  }),
});

export type InitTxnInput = {
  type: "CR" | "DR";
  userId: string;
  amount: number;
  accountNumber?: string;
  ifsc?: string;
};

export const getUserTxnsParamsSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
});

export const getUserTxnsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  nextToken: Joi.string().optional(),
});

export const getUserParamsSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
});

export const transactSchema = Joi.object({
  idempotentKey: Joi.string().trim().required(),
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
  amount: Joi.number().greater(0).required(),
  type: Joi.string().valid("credit", "debit").required(),
});

export type TransactInput = {
  idempotentKey: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
};


