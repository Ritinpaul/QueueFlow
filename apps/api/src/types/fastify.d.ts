import { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateApiKey: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  export interface FastifyRequest {
    project?: any; // Replace with specific project type if imported
  }
}
