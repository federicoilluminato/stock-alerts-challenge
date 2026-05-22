import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Invalid request body',
        statusCode: 400,
        details: error.flatten().fieldErrors,
      },
    });
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Unexpected server error';

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
};
