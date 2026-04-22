# Quick Reference Guide

Developer cheatsheet for common patterns, commands, and solutions.

---

## 🚀 Commands

```bash
# Development
npm run dev             # Start dev server with hot reload
npm run build          # Compile TypeScript → JavaScript
npm start              # Run production build

# Code Quality
npm run lint           # Check code style
npm run lint:fix       # Auto-fix linting issues

# Testing
npm test               # Run all tests
npm run test:watch    # Watch mode (re-run on changes)
npm run test:cov      # Generate coverage report

# Database
npm run db:seed       # Seed sample data
npm run db:migrate    # Run migrations
```

---

## 📁 Create New Module (10 minutes)

### Quick Copy-Paste

```bash
# 1. Create directory
mkdir -p src/app/modules/product

# 2. Create 6 files (use TEMPLATE as reference):
# - product.interface.ts
# - product.validation.ts
# - product.model.ts
# - product.service.ts
# - product.controller.ts
# - product.route.ts
```

### Register Module

```typescript
// src/init/di.ts
import { Product } from "../app/modules/product/product.model";

registerRepository("productRepo", Product);
registerService("productService", "productRepo", "Product");

// src/app/routes/index.ts
import { productRoutes } from "../modules/product/product.route";
router.use("/products", productRoutes);
```

### Template (Copy & Update)

```typescript
// product.interface.ts
export interface IProduct {
  _id?: string;
  name: string;
  price: number;
  createdAt?: Date;
}

// product.validation.ts
import { z } from "zod";
export const createSchema = z.object({
  name: z.string().min(3),
  price: z.number().positive(),
});

// product.model.ts
import { Schema, model } from "mongoose";
const schema = new Schema<IProduct>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});
export const Product = model("Product", schema);

// product.service.ts
import { BaseService } from "../../core";
class ProductService extends BaseService<IProduct> {
  constructor() {
    super(globalDI.get("productRepo"), "Product");
  }
  protected getSearchableFields() { return ["name"]; }
}
export const productService = new ProductService();

// product.controller.ts
const controller = createCRUDController(productService);
export const ProductController = {
  create: controller.create,
  getAll: controller.getAll,
  getById: controller.getById,
  update: controller.update,
  delete: controller.delete,
};

// product.route.ts
import { Router } from "express";
const router = Router();
router.post("/", validateRequest(createSchema), ProductController.create);
router.get("/", ProductController.getAll);
router.get("/:id", ProductController.getById);
router.patch("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);
export const productRoutes = router;
```

---

## 🎯 Common Patterns

### 1. Custom Business Logic Method

```typescript
// product.service.ts
class ProductService extends BaseService<IProduct> {
  constructor() {
    super(globalDI.get("productRepo"), "Product");
  }

  // Custom method (inherits CRUD from BaseService)
  async getByCategory(category: string) {
    return await this.findAll({
      filter: { category },
      sort: "-createdAt",
    });
  }

  async updateStock(productId: string, quantity: number) {
    return await this.updateById(productId, {
      stock: { $inc: quantity },
    } as any);
  }
}
```

### 2. Add Custom Endpoint

```typescript
// product.controller.ts
const getLowStock = catchAsync(async (req, res) => {
  const products = await productService.getByCategory(
    req.query.category as string
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved",
    data: products,
  });
});

export const ProductController = {
  ...createCRUDController(productService),
  getLowStock,
};

// product.route.ts
router.get("/by-category", ProductController.getLowStock);
```

### 3. Search, Filter, Pagination

```typescript
// In your controller or route
const result = await productService.findAll({
  // Filter
  filter: { category: "electronics", inStock: true },
  
  // Search across multiple fields
  search: { 
    term: "laptop",
    fields: ["name", "description"]
  },
  
  // Pagination
  pagination: { page: 1, limit: 10 },
  
  // Sorting
  sort: "-price",  // Descending
  
  // Select specific fields
  select: "name price category",
});
```

### 4. Throw Custom Error

```typescript
import AppError, { ErrorType } from "../../errorHelpers/AppError";

// Simple error
throw new AppError(400, "Invalid email");

// With error type (better for debugging)
throw new AppError(
  404,
  "Product not found",
  ErrorType.NOT_FOUND_ERROR
);

// Operational error (don't crash server)
throw new AppError(
  400,
  "Bad request",
  ErrorType.INVALID_INPUT,
  true  // isOperational = true
);
```

### 5. Wrap Async Function

```typescript
// catchAsync automatically catches errors
const getProduct = catchAsync(async (req, res) => {
  const product = await productService.findById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: product,
  });
  // Errors automatically caught and sent to global handler
});
```

### 6. Validate Request Body

```typescript
// Define validation schema
const updateSchema = z.object({
  name: z.string().optional(),
  price: z.number().positive().optional(),
});

// Use in route
router.patch(
  "/:id",
  validateRequest(updateSchema),
  ProductController.update
);

// Validation happens automatically
// Invalid data → 400 error with details
```

### 7. Get Authenticated User

```typescript
const getMyProducts = catchAsync(async (req, res) => {
  const userId = (req as any).user?.id;  // From auth middleware
  
  const products = await productService.findAll({
    filter: { userId },
  });
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: products,
  });
});
```

### 8. Get Query Parameters

```typescript
const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search as string;
  const category = req.query.category as string;

  const result = await productService.findAll({
    filter: category ? { category } : {},
    search: search ? { term: search, fields: ["name"] } : undefined,
    pagination: { page, limit },
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: result.data,
    meta: { page, limit, total: result.total },
  });
});
```

### 9. File Upload

```typescript
import multer from "multer";
import { cloudinary } from "../../config/cloudinary";

const upload = multer({ dest: "uploads/" });

const uploadFile = catchAsync(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError(400, "No file provided");

  const result = await cloudinary.uploader.upload(file.path);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: { url: result.secure_url },
  });
});

router.post("/upload", upload.single("file"), uploadFile);
```

### 10. Rate Limit Custom Endpoint

```typescript
import { createLimiter } from "../../config/rateLimit";

// Limit: 30 creates per minute per user
router.post(
  "/",
  createLimiter,
  validateRequest(createSchema),
  ProductController.create
);
```

---

## 🔐 Authentication Patterns

### Login Endpoint

```typescript
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await userService.findOne({ email });
  if (!user) throw new AppError(401, "Invalid credentials");

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new AppError(401, "Invalid credentials");

  // Generate token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Login successful",
    data: { user, token },
  });
});
```

### Protected Route

```typescript
// Middleware automatically checks JWT
router.get("/profile", authenticate, ProfileController.getProfile);

// In controller
const getProfile = catchAsync(async (req, res) => {
  const userId = (req as any).user?.id;
  const user = await userService.findById(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    data: user,
  });
});
```

### Authorization (Role-based)

```typescript
// Only admin can access
router.delete("/:id", authenticate, authorize("admin"), controller.delete);

// In middleware
const authorize = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).user?.role;
  if (userRole !== role) {
    throw new AppError(403, "Access denied");
  }
  next();
};
```

---

## 💾 Database Queries

### Create

```typescript
// Single
const user = await userService.create({
  name: "John",
  email: "john@example.com",
});

// Multiple
const users = await userService.createMany([
  { name: "John", email: "john@example.com" },
  { name: "Jane", email: "jane@example.com" },
]);
```

### Read

```typescript
// Find by ID
const user = await userService.findById(userId);

// Find one
const user = await userService.findOne({ email });

// Find all
const { data, total } = await userService.findAll();

// Find with pagination
const { data, total } = await userService.findAll({
  pagination: { page: 1, limit: 10 },
});

// Find with filter
const { data, total } = await userService.findAll({
  filter: { role: "admin", isActive: true },
});

// Find with search
const { data, total } = await userService.findAll({
  search: { term: "john", fields: ["name", "email"] },
});

// Count
const count = await userService.count({ role: "admin" });

// Check exists
const exists = await userService.exists({ email });
```

### Update

```typescript
// Single by ID
const user = await userService.updateById(userId, { name: "Jane" });

// Single by filter
const user = await userService.updateOne(
  { email },
  { name: "Jane" }
);

// Multiple
const result = await userService.updateMany(
  { role: "user" },
  { isActive: false }
);
```

### Delete

```typescript
// Single by ID
const user = await userService.deleteById(userId);

// Single by filter
const user = await userService.deleteOne({ email });

// Multiple
const result = await userService.deleteMany({ isActive: false });
```

### Aggregation

```typescript
const stats = await userService.aggregate([
  { $match: { role: "admin" } },
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

---

## 📝 Response Format

### Success Response

```typescript
sendResponse(res, {
  statusCode: 200,
  success: true,
  message: "Operation successful",
  data: result,
  meta: { page: 1, limit: 10, total: 100 },
});

// Response body:
{
  "statusCode": 200,
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "meta": { "page": 1, "limit": 10, "total": 100 }
}
```

### Error Response

```typescript
throw new AppError(400, "Validation failed", ErrorType.VALIDATION_ERROR);

// Response body:
{
  "statusCode": 400,
  "success": false,
  "message": "Validation failed",
  "error": "ValidationError"
}
```

### Paginated Response

```typescript
sendResponse(res, {
  statusCode: 200,
  success: true,
  message: "Users retrieved",
  data: users,  // Array
  meta: {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    total: result.total,
    pages: Math.ceil(result.total / 10),
  },
});
```

---

## 🛡️ Error Handling Quick Tips

| Error | Status | ErrorType | How to Fix |
|-------|--------|-----------|-----------|
| Field required | 400 | VALIDATION_ERROR | Add all required fields |
| Duplicate email | 409 | RESOURCE_EXISTS | Check email already used |
| User not found | 404 | NOT_FOUND_ERROR | Check ID is valid |
| Wrong password | 401 | AUTH_ERROR | Check credentials |
| Token expired | 401 | AUTH_ERROR | Refresh token needed |
| Not admin | 403 | PERMISSION_ERROR | Need admin role |
| Too many requests | 429 | RATE_LIMIT_ERROR | Wait before retrying |
| Database error | 500 | SERVER_ERROR | Check DB connection |

---

## 🧪 Testing Quick Patterns

### Test Service Method

```typescript
import { DIContainer } from "../src/app/core";
import { UserService } from "../src/app/modules/user/user.service";
import { MockUserRepository } from "./mocks/MockUserRepository";

describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    const di = new DIContainer();
    di.singleton("userRepo", () => new MockUserRepository());
    service = new UserService();
  });

  it("should create user", async () => {
    const user = await service.create({
      email: "test@example.com",
      name: "Test",
    });
    expect(user.email).toBe("test@example.com");
  });
});
```

### Test Endpoint

```typescript
import request from "supertest";
import app from "../src/app";

describe("User Routes", () => {
  it("GET /users should list users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /users should create user", async () => {
    const res = await request(app).post("/api/users").send({
      email: "new@example.com",
      password: "pass123",
      name: "New User",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("new@example.com");
  });
});
```

---

## 🔗 Environment Variables Quick Ref

```env
# Essential
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key

# Security
JWT_EXPIRATION=7d
BCRYPT_SALT_ROUND=10
CORS_ORIGIN=http://localhost:3000

# Optional Services
REDIS_HOST=localhost
REDIS_PORT=6379
CLOUDINARY_NAME=your-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

---

## 📊 Performance Tips

| Optimization | Impact | Implementation |
|--------------|--------|-----------------|
| Use `.lean()` | 10x faster | `.find().lean()` |
| Add indexes | 100x faster | Schema: `{ unique: true }` |
| Pagination | 100x less memory | `limit(10).skip(0)` |
| Field selection | 50% smaller | `.select("name email")` |
| Caching | 1000x faster | Redis for hot data |
| Rate limiting | Prevents abuse | Built-in: `rateLimit()` |

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Port 5000 already in use | Another process | Change PORT in .env |
| Cannot connect MongoDB | DB not running | Start MongoDB service |
| JWT errors | Token expired | Client should refresh token |
| CORS errors | Frontend URL wrong | Check CORS_ORIGIN in .env |
| Rate limit 429 | Too many requests | Wait or increase limits |
| Duplicate key error | Unique field exists | Check for existing record |

---

## 🎯 Workflow Example

```typescript
// 1. Define interface
interface ITask { name: string; done: boolean; }

// 2. Create validation
const createSchema = z.object({ name: z.string() });

// 3. Create model
const taskSchema = new Schema({ name: String, done: Boolean });
const Task = model("Task", taskSchema);

// 4. Create service
class TaskService extends BaseService<ITask> {
  constructor() { super(globalDI.get("taskRepo"), "Task"); }
}

// 5. Create controller
const controller = createCRUDController(taskService);

// 6. Create routes
router.post("/", validateRequest(createSchema), controller.create);
router.get("/", controller.getAll);

// 7. Register in DI
registerRepository("taskRepo", Task);
registerService("taskService", "taskRepo", "Task");

// 8. Add to main routes
router.use("/tasks", taskRoutes);

// Done! All CRUD endpoints working with search, filter, pagination
```

---

**Need more? Check:**
- README.md - Full feature guide
- ERROR-HANDLING.md - Error patterns
- SETUP.md - Configuration details
- ENTERPRISE-UTILITIES.md - Architecture patterns
