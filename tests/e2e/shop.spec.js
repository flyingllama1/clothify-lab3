const { randomUUID } = require("node:crypto");
const { test: base, expect } = require("@playwright/test");
const { AuthPage, CatalogPage, CartPage, CheckoutPage } = require("./pages");
const { products } = require("../fixtures.cjs");

const apiURL = "http://127.0.0.1:3001/api";
const shirt = products[0];

function newBuyer() {
  return {
    fullName: "Test Buyer",
    email: `buyer-${randomUUID()}@example.test`,
    password: "ExamplePass123",
  };
}

const test = base.extend({
  registeredBuyer: async ({ request }, use) => {
    const buyer = newBuyer();
    const response = await request.post(`${apiURL}/users/register`, { data: buyer });
    expect(response.status()).toBe(200);
    await use(buyer);
  },
});

async function signIn(page, buyer) {
  const auth = new AuthPage(page);
  await auth.login(buyer);
  await expect(auth.logoutButton()).toBeVisible();
  return auth;
}

test("UI-01 Registration", async ({ page }) => {
  const auth = new AuthPage(page);
  const registration = page.waitForResponse((response) =>
    response.url().endsWith("/api/users/register") && response.request().method() === "POST");
  await auth.register(newBuyer());
  expect((await registration).status()).toBe(200);
  await expect(page.getByText("Signup successful")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("UI-02 Login and access to the cart", async ({ page, registeredBuyer }) => {
  await signIn(page, registeredBuyer);
  await expect(page).toHaveURL("/");
  await new CartPage(page).open();
  await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
});

test("UI-03 Search by partial product name", async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.open();
  await expect(catalog.title(products[2].title)).toBeVisible();

  await catalog.searchBox.fill("  cHeCk  ");
  await expect(catalog.title(shirt.title)).toBeVisible();
  await expect(catalog.title(products[2].title)).toHaveCount(0);

  await catalog.searchBox.fill("no-such-product");
  await expect(page.getByRole("status")).toHaveText("No products found");
  await catalog.searchBox.clear();
  await expect(catalog.title(products[2].title)).toBeVisible();
});

test("UI-04 Add a product to the cart", async ({ page, registeredBuyer }) => {
  await signIn(page, registeredBuyer);
  const catalog = new CatalogPage(page);
  await catalog.openProduct(shirt.title);
  await catalog.addFromProductDetails(shirt.size);
  await expect(page.getByText("Added to cart Sucsessfully")).toBeVisible();

  await new CartPage(page).open();
  await expect(page.getByRole("heading", { name: shirt.title })).toBeVisible();
  await expect(page.getByText("Qty: 1")).toBeVisible();
  await expect(page.getByText("Total: $ 39")).toBeVisible();
});

test("UI-05 Place an order and display the saved details", async ({ page, request, registeredBuyer }, testInfo) => {
  const session = await request.post(`${apiURL}/users/login`, { data: registeredBuyer });
  expect(session.status()).toBe(200);
  const { token, userId } = await session.json();
  const seededCart = await request.post(`${apiURL}/cart/add`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      userId, productId: shirt._id, title: shirt.title, images: shirt.images,
      price: shirt.price, quantity: 2, size: shirt.size,
    },
  });
  expect(seededCart.status()).toBe(201);

  await signIn(page, registeredBuyer);
  const cart = new CartPage(page);
  await cart.open();
  await cart.checkout();

  const checkout = new CheckoutPage(page);
  await expect(page.getByText("Total: $78")).toBeVisible();
  await checkout.submit({
    firstName: "Test", lastName: "Buyer", email: registeredBuyer.email,
    address: "10 Test Street", city: "Moscow", pinCode: "101000",
  });

  await expect(page).toHaveURL(/\/placed$/);
  await expect(page.getByRole("heading", { name: "Order Placed Successfully!" })).toBeVisible();
  await expect(page.getByText("Order ID:")).toBeVisible();
  await expect(page.getByText("Shipping Address: 10 Test Street, Moscow, 101000")).toBeVisible();
  await expect(page.getByText(shirt.title, { exact: true })).toBeVisible();
  await expect(page.getByText("Quantity: 2")).toBeVisible();
  await expect(page.getByText("Total Price: ₹78")).toBeVisible();
  await testInfo.attach("order-confirmation", { body: await page.screenshot(), contentType: "image/png" });
});

test("UI-06 Logout protects the cart again", async ({ page, registeredBuyer }) => {
  const auth = await signIn(page, registeredBuyer);
  await auth.logoutButton().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(auth.logoutButton()).toHaveCount(0);
  await new CartPage(page).open();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("userId"))).toBeNull();
});
