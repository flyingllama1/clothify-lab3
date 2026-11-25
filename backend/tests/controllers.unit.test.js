const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
const Order = require("../models/OrderModel");
const userController = require("../controller/UserController");
const cartController = require("../controller/CartController");
const productController = require("../controller/ProductController");
const orderController = require("../controller/OrderController");
const { protect } = require("../middleware/authentication");
const app = require("../app");
const { products } = require("../../tests/fixtures.cjs");

const user = { _id: "650000000000000000000011", fullName: "Test User", email: "user@example.test" };
const credentials = { email: user.email, password: "SamplePass123" };
const product = products[0];
const cartItem = { productId: product._id, title: product.title, images: product.images,
  price: product.price, quantity: 2, size: product.size, userId: user._id };

before(() => {
  process.env.JWT_SECRET = "unit-test-secret";
});

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("authentication rejects a missing token", async () => {
  const res = response();
  await protect({ headers: {} }, res, assert.fail);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Unauthorized");
});

test("authentication rejects an invalid token", async () => {
  const res = response();
  await protect({ headers: { authorization: "Bearer invalid" } }, res, assert.fail);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, "Invalid token");
});

test("authentication passes the verified user ID to the route", async (t) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const next = t.mock.fn();
  await protect(req, response(), next);
  assert.equal(req.userId, user._id);
  assert.equal(next.mock.callCount(), 1);
});

test("registration saves a password hash", async (t) => {
  t.mock.method(User, "exists", async () => null);
  const create = t.mock.method(User, "create", async () => {});
  const res = response();
  await userController.register({ body: { ...credentials, fullName: user.fullName } }, res);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(res.statusCode, 200);
  assert.equal(saved.email, credentials.email);
  assert.notEqual(saved.password, credentials.password);
  assert.equal(await bcrypt.compare(credentials.password, saved.password), true);
});

test("registration rejects an existing email", async (t) => {
  t.mock.method(User, "exists", async () => ({ _id: user._id }));
  const res = response();
  await userController.register({ body: credentials }, res);
  assert.equal(res.statusCode, 400);
});

test("registration handles a duplicate email reported during save", async (t) => {
  t.mock.method(User, "exists", async () => null);
  t.mock.method(User, "create", async () => {
    throw Object.assign(new Error("Duplicate"), { code: 11000 });
  });
  const res = response();
  await userController.register({ body: credentials }, res);
  assert.equal(res.statusCode, 400);
});

test("registration reports a database error", async (t) => {
  t.mock.method(User, "exists", async () => { throw new Error("Database unavailable"); });
  const res = response();
  await userController.register({ body: credentials }, res);
  assert.equal(res.statusCode, 500);
});

test("login returns a token for matching credentials", async (t) => {
  const password = await bcrypt.hash(credentials.password, 5);
  t.mock.method(User, "findOne", async () => ({ ...user, password }));
  const res = response();
  await userController.login({ body: credentials }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).userId, user._id);
  assert.equal(res.body.userName, user.fullName);
});

test("login rejects a wrong password", async (t) => {
  const password = await bcrypt.hash("AnotherPassword", 5);
  t.mock.method(User, "findOne", async () => ({ ...user, password }));
  const res = response();
  await userController.login({ body: credentials }, res);
  assert.equal(res.statusCode, 401);
});

test("login returns 404 for an unknown email", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  const res = response();
  await userController.login({ body: credentials }, res);
  assert.equal(res.statusCode, 404);
});

test("login reports a database error", async (t) => {
  t.mock.method(User, "findOne", async () => { throw new Error("Database unavailable"); });
  const res = response();
  await userController.login({ body: credentials }, res);
  assert.equal(res.statusCode, 500);
});

test("catalog returns products from the model", async (t) => {
  t.mock.method(Product, "find", async () => products);
  const res = response();
  await productController.getProducts({}, res, assert.fail);
  assert.deepEqual(res.body, products);
});

test("catalog passes database errors to Express", async (t) => {
  const error = new Error("Database unavailable");
  t.mock.method(Product, "find", async () => { throw error; });
  const next = t.mock.fn();
  await productController.getProducts({}, response(), next);
  assert.deepEqual(next.mock.calls[0].arguments, [error]);
});

test("product details return the model result", async (t) => {
  const findById = t.mock.method(Product, "findById", async () => product);
  const res = response();
  await productController.getSingleProducts({ params: { id: product._id } }, res);
  assert.equal(res.body, product);
  assert.deepEqual(findById.mock.calls[0].arguments, [product._id]);
});

test("product details return 404 for a missing record", async (t) => {
  t.mock.method(Product, "findById", async () => null);
  const res = response();
  await productController.getSingleProducts({ params: { id: product._id } }, res);
  assert.equal(res.statusCode, 404);
});

test("cart saves the chosen size and quantity", async (t) => {
  const save = t.mock.method(Cart.prototype, "save", async () => {});
  const res = response();
  await cartController.addCart({ body: cartItem }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.cartItem.size, cartItem.size);
  assert.equal(res.body.cartItem.quantity, 2);
  assert.equal(save.mock.callCount(), 1);
});

test("cart lists items belonging to the authenticated user", async (t) => {
  const find = t.mock.method(Cart, "find", async () => [cartItem]);
  const res = response();
  await cartController.getCart({ userId: user._id }, res);
  assert.deepEqual(res.body, [cartItem]);
  assert.deepEqual(find.mock.calls[0].arguments, [{ userId: user._id }]);
});

test("cart updates a quantity and returns the changed cart item", async (t) => {
  const item = { ...cartItem, quantity: 3 };
  const update = t.mock.method(Cart, "findByIdAndUpdate", async () => item);
  const res = response();
  await cartController.updateCart({ params: { id: "item" }, body: { quantity: 3 } }, res);
  assert.equal(res.body.cartItem.quantity, 3);
  assert.deepEqual(update.mock.calls[0].arguments, ["item", { quantity: 3 }, { new: true }]);
});

test("cart returns 404 when deleting a missing item", async (t) => {
  t.mock.method(Cart, "findByIdAndDelete", async () => null);
  const res = response();
  await cartController.removeCart({ params: { id: "item" } }, res);
  assert.equal(res.statusCode, 404);
});

test("order rejects an empty list of items", async () => {
  const res = response();
  await orderController.createOrder({ body: { products: [] } }, res);
  assert.equal(res.statusCode, 400);
});

test("order saves a new order with pending statuses", async (t) => {
  const save = t.mock.method(Order.prototype, "save", async () => {});
  const res = response();
  await orderController.createOrder({ userId: user._id, body: {
    products: [cartItem], totalPrice: 78, shippingAddress: "10 Test Street",
  } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.totalPrice, 78);
  assert.equal(res.body.order.paymentStatus, "Pending");
  assert.equal(res.body.order.orderStatus, "Pending");
  assert.equal(save.mock.callCount(), 1);
});

test("order history looks up orders by user ID", async (t) => {
  const order = { totalPrice: 78, products: [cartItem] };
  const find = t.mock.method(Order, "find", async () => [order]);
  const res = response();
  await orderController.getOrders({ userId: user._id }, res);
  assert.deepEqual(res.body, [order]);
  assert.deepEqual(find.mock.calls[0].arguments, [{ userId: user._id }]);
});

test("Express exports the application without opening a port", () => {
  assert.equal(typeof app.listen, "function");
  assert.equal(typeof app, "function");
});
