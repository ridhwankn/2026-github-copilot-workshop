# Swagger/OpenAPI Documentation Setup

## ✅ Installation Complete

Swagger/OpenAPI has been successfully added to the Fastify backend with the following packages:
- `@fastify/swagger` - OpenAPI schema generation
- `@fastify/swagger-ui` - Interactive Swagger UI

---

## 🌐 Accessing API Documentation

Once the development server is running (`npm run dev`), access the API documentation at:

```
http://localhost:3000/api-docs
```

### Features:
- 📚 **Interactive API Explorer** - View all endpoints with request/response schemas
- 🧪 **Try It Out** - Execute API calls directly from the UI
- 📋 **Request/Response Examples** - See data structures for each endpoint
- 🏷️ **Tags** - Endpoints grouped by resource (Requisitions, Purchase Orders, Health)

---

## 📝 Documented Endpoints

### Health Check
- `GET /health` - Service health status

### Purchase Requisitions (PR)
- `GET /api/requisitions` - List all purchase requisitions
- `POST /api/requisitions` - Create new requisition
- `GET /api/requisitions/:id` - Get requisition details
- `POST /api/requisitions/:id/submit` - Submit requisition
- `POST /api/requisitions/:id/approve` - Approve requisition
- `GET /api/requisitions/:id/open-lines` - Get non-allocated lines

### Purchase Orders (PO)
- `GET /api/purchase-orders` - List all purchase orders
- `POST /api/purchase-orders` - Create new purchase order
- `GET /api/purchase-orders/:id` - Get purchase order details
- `POST /api/purchase-orders/:id/submit` - Submit purchase order
- `GET /api/purchase-orders/:id/open-lines` - Get non-received lines

---

## 🛠️ How Swagger Documentation Works

Each route now includes:
1. **Schema Definition** - Request and response formats in JSON Schema
2. **Description** - What the endpoint does
3. **Parameters** - Path, query, and body parameters
4. **Tags** - Grouping for organization
5. **Status Codes** - Expected HTTP responses

### Example Route Definition:
```javascript
fastify.get(
  '/api/purchase-orders/:id',
  {
    schema: {
      description: 'Get a purchase order by ID',
      tags: ['Purchase Orders'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Purchase Order ID' },
        },
      },
      response: {
        200: { description: 'Purchase order details', type: 'object' },
        404: { description: 'Purchase order not found', type: 'object' },
      },
    },
  },
  async (request, reply) => { ... }
);
```

---

## 🔄 How to Update Documentation

When you add new endpoints:

1. **Add schema object** to your route registration:
```javascript
fastify.post(
  '/api/my-endpoint',
  {
    schema: {
      description: 'What this does',
      tags: ['Tag Name'],
      body: { /* JSON Schema */ },
      response: {
        201: { /* response schema */ },
      },
    },
  },
  async (request, reply) => { ... }
);
```

2. **Swagger UI automatically regenerates** when server restarts
3. **No manual documentation** needed - schema IS the documentation

---

## 📊 OpenAPI Specification

The full OpenAPI specification is available at:
```
http://localhost:3000/swagger.json
```

This JSON file contains:
- Complete API schema
- All endpoints and methods
- Request/response formats
- Error responses
- Server information

### Use Cases:
- **Code Generation** - Generate client SDKs from spec
- **Contract Testing** - Verify API matches spec
- **API Mocking** - Mock server based on spec
- **Integration** - Import into tools like Postman

---

## 🚀 Quick Start

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open Swagger UI:**
   ```
   http://localhost:3000/api-docs
   ```

3. **Try an endpoint:**
   - Click on any endpoint (e.g., `GET /api/purchase-orders`)
   - Click "Try it out"
   - Click "Execute"
   - See response

---

## 📖 Files Modified

- `backend/src/app.js` - Added Swagger plugin registration
- `backend/src/plugins/swagger.js` - Swagger configuration
- `backend/src/routes/requisition-routes.js` - Added schema to all endpoints
- `backend/src/routes/purchase-order-routes.js` - Added schema to all endpoints
- `backend/package.json` - Added @fastify/swagger, @fastify/swagger-ui

---

## ✅ Best Practices

1. **Keep schemas in sync** with actual code behavior
2. **Use descriptive tags** to organize endpoints
3. **Document error responses** (400, 404, 500, etc.)
4. **Add examples** in descriptions when helpful
5. **Update schema** when API contract changes

---

## 🔗 References

- [Fastify Swagger Plugin](https://github.com/fastify/fastify-swagger)
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)
- [JSON Schema Reference](https://json-schema.org/)
