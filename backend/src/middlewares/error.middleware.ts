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
    const details = error.flatten().fieldErrors;
    const messages = Object.entries(details)
      .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
      .join('; ');

    return res.status(400).json({
      error: {
        message: messages || 'Invalid request body',
        statusCode: 400,
        details,
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
