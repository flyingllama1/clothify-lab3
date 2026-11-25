const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const app = require("../app");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const { products } = require("../../tests/fixtures.cjs");

let server;
let baseURL;
const product = products[0];
const password = "ExamplePass123";

before(async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("Set MONGO_URI to a local test MongoDB instance");
  }
  process.env.JWT_SECRET = "integration-test-secret";
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: `lab3_integration_${randomUUID().replaceAll("-", "")}`,
    serverSelectionTimeoutMS: 5000,
  });
  await User.init();
  await Product.insertMany(products);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
  }
});

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseURL}/api${path}`, {
    method, headers, body: body && JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

function account() {
  return { fullName: "Test Buyer", email: `${randomUUID()}@example.test`, password };
}

function register(body) {
  return request("/users/register", { method: "POST", body });
}

function login(email, suppliedPassword = password) {
  return request("/users/login", { method: "POST", body: { email, password: suppliedPassword } });
}

async function authenticatedUser() {
  const user = account();
  assert.equal((await register(user)).status, 200);
  const session = await login(user.email);
  assert.equal(session.status, 200);
  return session.data;
}

const cartProduct = {
  productId: product._id, title: product.title, images: product.images,
  price: product.price, quantity: 2, size: product.size,
};

test("POST /users/register saves the account and hashes the password", async () => {
  const user = account();
  assert.equal((await register(user)).status, 200);
  const saved = await User.findOne({ email: user.email });
  assert.equal(saved.fullName, user.fullName);
  assert.notEqual(saved.password, password);
});

test("POST /users/register rejects a duplicate email", async () => {
  const user = account();
  assert.equal((await register(user)).status, 200);
  assert.equal((await register(user)).status, 400);
  assert.equal(await User.countDocuments({ email: user.email }), 1);
});

test("POST /users/login returns a token linked to the stored user", async () => {
  const user = account();
  assert.equal((await register(user)).status, 200);
  const result = await login(user.email);
  const saved = await User.findOne({ email: user.email });
  assert.equal(result.status, 200);
  assert.ok(result.data.token);
  assert.equal(result.data.userId, saved.id);
});

test("POST /users/login rejects an incorrect password", async () => {
  const user = account();
  assert.equal((await register(user)).status, 200);
  const result = await login(user.email, "WrongPassword");
  assert.equal(result.status, 401);
  assert.equal(result.data.token, undefined);
});

test("GET /products lists sample products saved in MongoDB", async () => {
  const result = await request("/products");
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.map(({ title }) => title).sort(), products.map(({ title }) => title).sort());
});

test("GET /products/:id loads details by product ID", async () => {
  const result = await request(`/products/${product._id}`);
  assert.equal(result.status, 200);
  assert.equal(result.data.title, product.title);
  assert.equal(result.data.size, product.size);
});

test("GET /cart requires authentication", async () => {
  const result = await request("/cart");
  assert.equal(result.status, 401);
});

test("POST /cart/add persists an item that GET /cart returns", async () => {
  const { token, userId } = await authenticatedUser();
  const added = await request("/cart/add", { method: "POST", token,
    body: { ...cartProduct, userId } });
  assert.equal(added.status, 201);
  const cart = await request("/cart", { token });
  assert.equal(cart.status, 200);
  assert.equal(cart.data.length, 1);
  assert.equal(cart.data[0].productId, product._id);
  assert.equal(cart.data[0].quantity, 2);
  assert.equal(cart.data[0].size, product.size);
});

test("POST /orders/create stores an order that GET /orders/get returns", async () => {
  const { token } = await authenticatedUser();
  const order = { products: [cartProduct], totalPrice: 78, shippingAddress: "10 Test Street" };
  const created = await request("/orders/create", { method: "POST", token, body: order });
  assert.equal(created.status, 201);
  const history = await request("/orders/get", { token });
  assert.equal(history.status, 200);
  assert.equal(history.data.length, 1);
  assert.equal(history.data[0]._id, created.data.order._id);
  assert.equal(history.data[0].totalPrice, order.totalPrice);
  assert.equal(history.data[0].shippingAddress, order.shippingAddress);
  assert.equal(history.data[0].products[0].productId, product._id);
  assert.equal(history.data[0].orderStatus, "Pending");
});

test("POST /orders/create rejects an empty order", async () => {
  const { token } = await authenticatedUser();
  const result = await request("/orders/create", { method: "POST", token, body: { products: [] } });
  assert.equal(result.status, 400);
  assert.deepEqual((await request("/orders/get", { token })).data, []);
});
