import axios from "axios";

interface Credentials {
  email: string;
  password: string;
}

interface OrderProduct {
  productId: string;
  images: string[];
  title: string;
  price: number;
  quantity: number;
}

interface CartProduct extends OrderProduct {
  userId: string | null;
  size: string;
}

interface OrderData {
  products: OrderProduct[];
  totalPrice: number;
  shippingAddress: string;
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiErrorMessage(error: unknown): string {
  return (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message)
    || "An unexpected error occurred";
}

export const signup = (userData: Credentials & { fullName: string }) => api.post("/users/register", userData);
export const login = (credentials: Credentials) => api.post("/users/login", credentials);
export const getProducts = () => api.get("/products");
export const getProductById = (id: string) => api.get(`/products/${id}`);
export const addToCart = (item: CartProduct) => api.post("/cart/add", item);
export const getCartItems = () => api.get("/cart");
export const deleteCartItem = (itemId: string) => api.delete(`/cart/remove/${itemId}`);
export const createOrder = (order: OrderData) => api.post("/orders/create", order);
export const getOrder = () => api.get("/orders/get");
