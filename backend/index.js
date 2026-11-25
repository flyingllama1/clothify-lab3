const mongoose = require("mongoose");
const app = require("./app");
require("dotenv").config();

async function start() {
  const { MONGO_URI, JWT_SECRET, PORT = "3001" } = process.env;
  if (!MONGO_URI || !JWT_SECRET) {
    throw new Error("MONGO_URI and JWT_SECRET are required");
  }

  await mongoose.connect(MONGO_URI);
  app.listen(Number(PORT), () => console.log(`Listening on port ${PORT}`));
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
