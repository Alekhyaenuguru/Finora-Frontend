
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api"
).replace(/\/+$/, "");

export function getToken() {
  return localStorage.getItem("finora_token");
}

export function saveAuth(data) {
  if (!data?.token) {
    throw new Error("The server did not return an authentication token.");
  }
  localStorage.setItem("finora_token", data.token);
  localStorage.setItem(
    "finora_user",
    JSON.stringify({
      userId: data.userId,
      name: data.name,
      email: data.email,
    })
  );
}

export function clearAuth() {
  localStorage.removeItem("finora_token");
  localStorage.removeItem("finora_user");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      // Keep the status-based message if the response isn't JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveAuth(data);
  return data;
}

export async function register(name, email, password) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  saveAuth(data);
  return data;
}

export function getTransactions() {
  return request("/transactions");
}

export function createTransaction(transaction) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(transaction),
  });
}

export function updateTransaction(id, transaction) {
  return request(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(transaction),
  });
}

export function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: "DELETE" });
}

export function getBudgets(month) {
  return request(`/budgets?month=${encodeURIComponent(month)}`);
}

export function createBudget(budget) {
  return request("/budgets", {
    method: "POST",
    body: JSON.stringify(budget),
  });
}
