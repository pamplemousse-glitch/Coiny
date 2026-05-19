import type { FastifyInstance } from 'fastify';

export function registerLogger(_app: FastifyInstance): void {
  // Fastify registers pino automatically via the logger option in server.ts.
  // This module exists as an extension point for custom serializers.
}

export const loggerOptions = {
  serializers: {
    req(req: { method: string; url: string; headers: Record<string, string> }) {
      return {
        method: req.method,
        url: req.url,
        // Never log Authorization headers — they may carry Teller access tokens.
      };
    },
    res(res: { statusCode: number }) {
      return { statusCode: res.statusCode };
    },
  },
};
