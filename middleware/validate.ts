import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export function validateBody(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    req.body = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    req.params = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    // Store validated query in a custom property since req.query is read-only
    (req as any).validatedQuery = value;
    next();
  };
}


