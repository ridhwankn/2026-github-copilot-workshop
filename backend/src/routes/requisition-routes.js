import {
  approveRequisition,
  createRequisition,
  getAvailablePrLinesForAllocation,
  getRequisitionById,
  getRequisitionOpenLines,
  listRequisitions,
  submitRequisition,
} from '../services/requisition-service.js';

export default async function requisitionRoutes(fastify) {
  fastify.get(
    '/api/requisitions',
    {
      schema: {
        description: 'List all purchase requisitions',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      const items = await listRequisitions(fastify.db);
      return { items };
    }
  );

  fastify.get(
    '/api/requisitions/available/for-allocation',
    {
      schema: {
        description: 'Get all available PR lines from approved requisitions that can be allocated to POs',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      const items = await getAvailablePrLinesForAllocation(fastify.db);
      return { items };
    }
  );

  fastify.post(
    '/api/requisitions',
    {
      schema: {
        description: 'Create a new purchase requisition',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      try {
        const requisition = await createRequisition(fastify.db, request.body);
        reply.code(201);
        return requisition;
      } catch (error) {
        if (error.statusCode) {
          reply.code(error.statusCode);
          return { message: error.message };
        }

        throw error;
      }
    }
  );

  fastify.post(
    '/api/requisitions/:id/submit',
    {
      schema: {
        description: 'Submit a purchase requisition',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      try {
        const requisition = await submitRequisition(fastify.db, request.params.id);
        if (!requisition) {
          reply.code(404);
          return { message: 'Requisition not found' };
        }

        return requisition;
      } catch (error) {
        if (error.statusCode) {
          reply.code(error.statusCode);
          return { message: error.message };
        }

        throw error;
      }
    }
  );

  fastify.post(
    '/api/requisitions/:id/approve',
    {
      schema: {
        description: 'Approve a purchase requisition',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      try {
        const requisition = await approveRequisition(fastify.db, request.params.id);
        if (!requisition) {
          reply.code(404);
          return { message: 'Requisition not found' };
        }

        return requisition;
      } catch (error) {
        if (error.statusCode) {
          reply.code(error.statusCode);
          return { message: error.message };
        }

        throw error;
      }
    }
  );

  fastify.get(
    '/api/requisitions/:id',
    {
      schema: {
        description: 'Get a purchase requisition by ID',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      const requisition = await getRequisitionById(fastify.db, request.params.id);
      if (!requisition) {
        reply.code(404);
        return { message: 'Requisition not found' };
      }

      return requisition;
    }
  );

  fastify.get(
    '/api/requisitions/:id/open-lines',
    {
      schema: {
        description: 'Get open lines for a purchase requisition (lines not fully allocated)',
        tags: ['Requisitions'],
      },
    },
    async (request, reply) => {
      const payload = await getRequisitionOpenLines(fastify.db, request.params.id);
      if (!payload) {
        reply.code(404);
        return { message: 'Requisition not found' };
      }

      return payload;
    }
  );
}
