import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyPlugin from 'fastify-plugin';

async function swaggerPlugin(app, opts) {
  // Register swagger to generate OpenAPI spec
  await app.register(swagger, {
    mode: 'dynamic',
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Procurement MVP API',
        description: 'REST API for Purchase Requisitions, Purchase Orders, and Goods Receipts',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      tags: [
        {
          name: 'Health',
          description: 'Service health checks',
        },
        {
          name: 'Requisitions',
          description: 'Purchase Requisition (PR) endpoints',
        },
        {
          name: 'Purchase Orders',
          description: 'Purchase Order (PO) endpoints',
        },
      ],
    },
  });

  // Register swagger-ui to serve the interactive documentation
  await app.register(swaggerUi, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

export default fastifyPlugin(swaggerPlugin);
