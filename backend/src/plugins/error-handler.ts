import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(function (error: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
    const status = error.statusCode ?? 500;
    app.log.error({ err: { message: error.message, code: error.code } }, 'request error');
    reply.status(status).send({ error: status >= 500 ? 'Internal Server Error' : error.message });
  });
}
