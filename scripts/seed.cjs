const mongoose = require("../backend/node_modules/mongoose");
const Product = require("../backend/models/ProductModel");
const { products } = require("../tests/fixtures.cjs");

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error("Set MONGO_URI to your local test database");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    for (const { _id, ...fields } of products) {
      await Product.updateOne({ _id }, { $set: fields }, { upsert: true, runValidators: true });
    }
    console.log(`Loaded ${products.length} products`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
