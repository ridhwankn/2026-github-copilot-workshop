import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
} from '../services/goods-receipt-service.js';

function sendServiceError(reply, error) {
  if (error.statusCode) {
    reply.code(error.statusCode);
    return { message: error.message };
  }
  throw error;
}

export default async function goodsReceiptRoutes(fastify) {
  fastify.get('/api/goods-receipts', async () => ({
    items: await listGoodsReceipts(fastify.db),
  }));

  fastify.post('/api/goods-receipts', async (request, reply) => {
    try {
      const receipt = await createGoodsReceipt(fastify.db, request.body);
      reply.code(201);
      return receipt;
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });

  fastify.get('/api/goods-receipts/:id', async (request, reply) => {
    const receipt = await getGoodsReceiptById(fastify.db, request.params.id);
    if (!receipt) {
      reply.code(404);
      return { message: 'Goods receipt not found' };
    }
    return receipt;
  });

  fastify.post('/api/goods-receipts/:id/post', async (request, reply) => {
    try {
      const receipt = await postGoodsReceipt(fastify.db, request.params.id);
      if (!receipt) {
        reply.code(404);
        return { message: 'Goods receipt not found' };
      }
      return receipt;
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });
}
