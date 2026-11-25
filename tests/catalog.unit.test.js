const { test } = require("node:test");
const assert = require("node:assert/strict");
const { filterProducts, productSizes } = require("../frontend/src/domain/catalog.ts");

const products = [{ title: "Blue Check Shirt" }, { title: "Red Sneakers" }];

test("catalog matches a partial title regardless of case", () => {
  assert.deepEqual(filterProducts(products, "cHeCk"), [products[0]]);
});

test("catalog trims the search query", () => {
  assert.deepEqual(filterProducts(products, "  red  "), [products[1]]);
});

test("catalog shows every product for a blank query", () => {
  assert.deepEqual(filterProducts(products, "  "), products);
});

test("catalog returns no matches for an unknown product", () => {
  assert.deepEqual(filterProducts(products, "jacket"), []);
});

test("catalog falls back to a single size from the database", () => {
  assert.deepEqual(productSizes({ size: "M", sizes: [] }), ["M"]);
});

test("catalog uses a list of sizes when provided", () => {
  assert.deepEqual(productSizes({ size: "M", sizes: ["S", "L"] }), ["S", "L"]);
});

test("catalog handles unavailable sizes", () => {
  assert.deepEqual(productSizes({}), []);
});
