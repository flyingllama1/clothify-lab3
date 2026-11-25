class AuthPage {
  constructor(page) {
    this.page = page;
  }

  async register({ fullName, email, password }) {
    await this.page.goto("/signup");
    await this.page.getByPlaceholder("Name", { exact: true }).fill(fullName);
    await this.page.getByPlaceholder("Email", { exact: true }).fill(email);
    await this.page.getByPlaceholder("Password", { exact: true }).fill(password);
    await this.page.getByRole("button", { name: "Sign Up", exact: true }).click();
  }

  async login({ email, password }) {
    await this.page.goto("/login");
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Login", exact: true }).click();
  }

  logoutButton() {
    return this.page.getByRole("navigation").getByRole("button", { name: "Logout" });
  }
}

class CatalogPage {
  constructor(page) {
    this.page = page;
    this.searchBox = page.getByRole("searchbox", { name: "Search products" });
  }

  async open() {
    await this.page.goto("/products");
  }

  title(name) {
    return this.page.getByRole("heading", { name, exact: true });
  }

  async openProduct(name) {
    await this.page.getByRole("link", { name, exact: true }).click();
  }

  async addFromProductDetails(size) {
    await this.page.getByRole("button", { name: size, exact: true }).click();
    await this.page.getByRole("button", { name: "Add to Cart" }).click();
  }
}

class CartPage {
  constructor(page) {
    this.page = page;
  }

  async open() {
    await this.page.getByRole("navigation").getByRole("link", { name: "Cart" }).click();
  }

  async checkout() {
    await this.page.getByRole("button", { name: "Proceed to Checkout" }).click();
  }
}

class CheckoutPage {
  constructor(page) {
    this.page = page;
  }

  async submit({ firstName, lastName, email, address, city, pinCode }) {
    await this.page.getByLabel("First Name", { exact: false }).fill(firstName);
    await this.page.getByLabel("Last Name", { exact: false }).fill(lastName);
    await this.page.getByLabel("Email", { exact: false }).fill(email);
    await this.page.getByLabel("Address", { exact: false }).fill(address);
    await this.page.getByLabel("City", { exact: false }).fill(city);
    await this.page.getByLabel("Pin Code", { exact: false }).fill(pinCode);
    await this.page.getByRole("button", { name: "Place Order" }).click();
  }
}

module.exports = { AuthPage, CatalogPage, CartPage, CheckoutPage };
