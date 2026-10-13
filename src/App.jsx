import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";


import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBudgets,
  createBudget as saveBudget,
  login,
  register,
  getToken,
  clearAuth,
} from "./services/api";


import "./App.css";
const COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  name: "",
  type: "expense",
  amount: "",
  category: "Food",
  date: today,
  description: "",
};

const categories = [
  "Food",
  "Shopping",
  "Transport",
  "Housing",
  "Bills",
  "Entertainment",
  "Salary",
  "Freelance",
  "Health",
  "Other",
];

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function displayDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    name: transaction.title ?? transaction.name ?? "",
    type: String(transaction.type ?? "").toLowerCase(),
    amount: Number(transaction.amount ?? 0),
    category: transaction.category ?? "Other",
    date: transaction.date ?? "",
    description: transaction.note ?? transaction.description ?? "",
  };
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(getToken())
  );
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [period, setPeriod] = useState("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  
const [budgets, setBudgets] = useState([]);
const [budgetLoading, setBudgetLoading] = useState(false);
const [budgetError, setBudgetError] = useState("");
const [currentUser, setCurrentUser] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("finora_user") || "null");
  } catch {
    return null;
  }
});
const [budgetForm, setBudgetForm] = useState({
  category: "Food",
  monthlyLimit: "",
  budgetMonth: new Date().toISOString().slice(0, 7),
});



async function loadBudgets() {
  setBudgetLoading(true);
  setBudgetError("");

  try {
    const data = await getBudgets(budgetForm.budgetMonth);

    setBudgets(Array.isArray(data) ? data : data ? [data] : []);

    // Reload transactions too, so budget spending is up to date.
    await loadTransactions();
  } catch (error) {
    setBudgetError(error.message || "Failed to refresh budgets.");
    console.error("Budget refresh failed:", error);
  } finally {
    setBudgetLoading(false);
  }
}


useEffect(() => {
  if (isAuthenticated) {
    loadBudgets();
  }
}, [isAuthenticated]);


async function createBudget(event) {
  event.preventDefault();
  setBudgetError("");

  try {
    await saveBudget({
      category: budgetForm.category,
      monthlyLimit: Number(budgetForm.monthlyLimit),
      budgetMonth: budgetForm.budgetMonth,
    });

    await loadBudgets();

    setBudgetForm((previous) => ({
      ...previous,
      monthlyLimit: "",
    }));
  } catch (error) {
    setBudgetError(error.message || "Failed to save budget.");
  }
}
  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        await register(authName.trim(), authEmail.trim(), authPassword);
      } else {
        await login(authEmail.trim(), authPassword);
      }

setCurrentUser(
  JSON.parse(localStorage.getItem("finora_user") || "null")
);
setIsAuthenticated(true);
await loadTransactions();
await loadBudgets();
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

function handleLogout() {
  clearAuth();
  setCurrentUser(null);
  setIsAuthenticated(false);
  setTransactions([]);
  setBudgets([]);
  setAuthPassword("");
  setAuthError("");
}
  
async function handleEditTransaction(transaction) {
  const title = window.prompt("Transaction title:", transaction.title);
  if (title === null) return;

  if (!title.trim()) {
    window.alert("Title cannot be empty.");
    return;
  }

  const amountInput = window.prompt(
    "Amount:",
    String(transaction.amount)
  );

  if (amountInput === null) return;

  const amount = Number(amountInput);

  if (!Number.isFinite(amount) || amount <= 0) {
    window.alert("Enter a valid amount greater than zero.");
    return;
  }

  const category = window.prompt(
    "Category:",
    transaction.category
  );
  if (category === null) return;

  const note = window.prompt(
    "Note:",
    transaction.note ?? ""
  );
  if (note === null) return;

  try {
    await updateTransaction(transaction.id, {
      title: title.trim(),
      type: transaction.type,
      amount,
      category: category.trim(),
      date: transaction.date,
      note: note.trim(),
    });

    await loadTransactions();
    window.alert("Transaction updated successfully.");
  } catch (error) {
    window.alert(error.message || "Could not update transaction.");
  }
}

async function handleDeleteTransaction(transaction) {
  const confirmed = window.confirm(
    `Delete "${transaction.title}" permanently?`
  );

  if (!confirmed) return;

  try {
    await deleteTransaction(transaction.id);
    await loadTransactions();
    window.alert("Transaction deleted successfully.");
  } catch (error) {
    window.alert(error.message || "Could not delete transaction.");
  }
}


async function loadTransactions() {
  try {
    setLoading(true);
    setError("");

    const data = await getTransactions();

    setTransactions(
      Array.isArray(data) ? data.map(normalizeTransaction) : []
    );
  } catch (err) {
    setError(
      err.message ||
        "Could not connect to the backend. Check that Spring Boot is running."
    );
  } finally {
    setLoading(false);
  }
}


useEffect(() => {
  if (isAuthenticated) {
    loadTransactions();
  }
}, [isAuthenticated]);

  const filteredByPeriod = useMemo(() => {
    const now = new Date();

    return transactions.filter((transaction) => {
      if (period === "all") return true;

      if (!transaction.date) return false;

      const date = new Date(`${transaction.date}T00:00:00`);

      if (Number.isNaN(date.getTime())) return false;

      if (period === "month") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }

      if (period === "year") {
        return date.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [transactions, period]);

  const totalIncome = useMemo(
    () =>
      filteredByPeriod
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [filteredByPeriod]
  );

  const totalExpenses = useMemo(
    () =>
      filteredByPeriod
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [filteredByPeriod]
  );

  const balance = totalIncome - totalExpenses;

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...filteredByPeriod]
      .filter((t) => {
        const matchesType =
          typeFilter === "all" || t.type === typeFilter;

        const matchesSearch =
          !query ||
          (t.name || "").toLowerCase().includes(query) ||
          (t.category || "").toLowerCase().includes(query) ||
          (t.description || "").toLowerCase().includes(query);

        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        return (b.date || "").localeCompare(a.date || "");
      });
  }, [filteredByPeriod, search, typeFilter]);

  const categoryData = useMemo(() => {
    const totals = {};

    filteredByPeriod
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const category = t.category || "Other";
        totals[category] = (totals[category] || 0) + Number(t.amount || 0);
      });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredByPeriod]);

  const trendData = useMemo(() => {
    const days = {};

    filteredByPeriod.forEach((t) => {
      const date = t.date || "Unknown";

      if (!days[date]) {
        days[date] = { date, income: 0, expenses: 0 };
      }

      if (t.type === "income") {
        days[date].income += Number(t.amount || 0);
      } else {
        days[date].expenses += Number(t.amount || 0);
      }
    });

    return Object.values(days)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((item) => ({
        ...item,
        label:
          item.date === "Unknown"
            ? item.date
            : new Date(`${item.date}T00:00:00`).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short" }
              ),
      }));
  }, [filteredByPeriod]);

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.name.trim()) {
      setError("Please enter a transaction title.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");


const saved = await createTransaction({
  title: form.name.trim(),
  type: form.type.toUpperCase(),
  amount,
  category: form.category,
  date: form.date,
  note: form.description.trim(),
});

const savedTransaction = normalizeTransaction(saved);

      // Replace any existing copy with the same backend ID instead of
      // inserting the same transaction twice into React state.
      setTransactions((current) => [
        savedTransaction,
        ...current.filter(
          (transaction) =>
            String(transaction.id) !== String(savedTransaction.id)
        ),
      ]);
      setForm({ ...emptyForm, date: today });
      setModalOpen(false);
      setNotice("Transaction saved successfully.");
    } catch (err) {
      setError(err.message || "Could not save the transaction.");
    } finally {
      setSaving(false);
    }
  }

  function openModal() {
    setError("");
    setNotice("");
    setForm({ ...emptyForm, date: today });
    setModalOpen(true);
  }
  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuthSubmit}>
          <div className="brand-mark">
            <Wallet size={24} />
          </div>

          <h1>Welcome to Finora</h1>
          <p>Manage your money with clarity.</p>

          <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>

          {authMode === "register" && (
            <label>
              Full name
              <input
                required
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              required
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              minLength={6}
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </label>

          {authError && <p className="auth-error">{authError}</p>}

          <button type="submit" disabled={authLoading}>
            {authLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

          <p>
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            {" "}
            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    );
  }
  return (
    <div className="finora-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Wallet size={23} />
          </div>
          <span>finora</span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </a>
          <a className="nav-item" href="#transactions">
            <Activity size={19} />
            <span>Transactions</span>
          </a>
          <a className="nav-item" href="#budgets">
            <CreditCard size={19} />
            <span>Budgets</span>
          </a>
          <a className="nav-item" href="#analytics">
            <CalendarDays size={19} />
            <span>Analytics</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Wallet size={20} />
            </div>
            <strong>Take control of your money</strong>
            <p>Build better financial habits, one day at a time.</p>
          </div>

          <a className="nav-item" href="#settings">
            <Settings size={19} />
            <span>Settings</span>
          </a>

              <div className="profile">
                <div className="avatar">
                  {(currentUser?.name || "F").charAt(0).toUpperCase()}
                </div>
                <div className="profile-text">
                  <strong>{currentUser?.name || "Finora User"}</strong>
                  <span>{currentUser?.email || "Personal account"}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              <button
                type="button"
                className="sign-out-button"
                onClick={handleLogout}
              >
                Sign out
              </button>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / Dashboard</div>
            <h1>Good day 👋</h1>
            <p className="subtitle">
              Here's what's happening with your money.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="button secondary"
              onClick={loadTransactions}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="button primary" onClick={openModal}>
              <Plus size={18} />
              Add transaction
            </button>
          </div>
        </header>

        {error && (
          <div className="notice error-notice" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div className="notice success-notice">
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="period-row">
          <div>
            <h2>Financial overview</h2>
            <p>Track your income, spending, and balance.</p>
          </div>

          <select
            className="period-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Summary period"
          >
            <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
        </section>

        <section className="summary-grid">
          <article className="summary-card">
            <div className="summary-top">
              <span>Total balance</span>
              <div className="summary-icon purple">
                <Wallet size={20} />
              </div>
            </div>
            <h2>{money(balance)}</h2>
            <div className="summary-foot">
              <span className="muted">Income minus expenses</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Total income</span>
              <div className="summary-icon green">
                <ArrowDownLeft size={20} />
              </div>
            </div>
            <h2>{money(totalIncome)}</h2>
            <div className="summary-foot">
              <span className="positive">Money received</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Total expenses</span>
              <div className="summary-icon orange">
                <ArrowUpRight size={20} />
              </div>
            </div>
            <h2>{money(totalExpenses)}</h2>
            <div className="summary-foot">
              <span className="muted">Money spent</span>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-top">
              <span>Transactions</span>
              <div className="summary-icon blue">
                <ShoppingBag size={20} />
              </div>
            </div>
            <h2>{filteredByPeriod.length}</h2>
            <div className="summary-foot">
              <span className="muted">In selected period</span>
            </div>
          </article>
        </section>

        

<section className="charts-grid" id="analytics">
          <article className="panel trend-panel">
            <div className="panel-heading">
              <div>
                <h3>Cash flow</h3>
                <p>Income and expenses over time</p>
              </div>
            </div>

            <div className="chart-container">
              {trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="incomeGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#14b8a6"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#14b8a6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="expenseGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e9edf4"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#8993a4", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#8993a4", fontSize: 12 }}
                      tickFormatter={(value) =>
                        value >= 1000
                          ? `₹${(value / 1000).toFixed(0)}k`
                          : `₹${value}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => money(value)}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e9edf4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      fill="url(#incomeGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill="url(#expenseGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">
                  {loading
                    ? "Loading your financial data..."
                    : "Add transactions to see your cash flow."}
                </div>
              )}
            </div>

            <div className="chart-legend">
              <span><i className="legend-dot income-dot" /> Income</span>
              <span><i className="legend-dot expense-dot" /> Expenses</span>
            </div>
          </article>

          <article className="panel category-panel">
            <div className="panel-heading">
              <div>
                <h3>Spending categories</h3>
                <p>Where your money goes</p>
              </div>
            </div>

            {categoryData.length ? (
              <>
                <div className="donut-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={4}
                      >
                        {categoryData.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <span>Total spent</span>
                    <strong>{money(totalExpenses)}</strong>
                  </div>
                </div>

                <div className="category-list">
                  {categoryData.slice(0, 5).map((item, index) => (
                    <div className="category-row" key={item.name}>
                      <div className="category-name">
                        <i
                          className="legend-dot"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <strong>{money(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-chart">
                No expense categories yet.
              </div>
            )}
          </article>
        </section>

        <section className="panel transactions-panel" id="transactions">
          <div className="transactions-heading">
            <div>
              <h3>Recent transactions</h3>
              <p>Your latest recorded financial activity</p>
            </div>
            <span className="transaction-count">
              {visibleTransactions.length} records
            </span>
          </div>

          <div className="table-tools">
            <div className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filter transaction type"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          <div className="table-scroll">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="amount-column">Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <div className="transaction-title">
                        <div
                          className={`transaction-icon ${
                            transaction.type === "income"
                              ? "transaction-income"
                              : "transaction-expense"
                          }`}
                        >
                          {transaction.type === "income" ? (
                            <ArrowDownLeft size={18} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </div>
                        <div>
                          <strong>{transaction.name}</strong>
                          {transaction.description && (
                            <span>{transaction.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">
                        {transaction.category || "Other"}
                      </span>
                    </td>
                    <td>{displayDate(transaction.date)}</td>
                    <td>
                      <span
                        className={`type-badge ${
                          transaction.type === "income"
                            ? "type-income"
                            : "type-expense"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={`amount-column amount ${
                        transaction.type === "income"
                          ? "amount-positive"
                          : "amount-negative"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "−"}
                      {money(transaction.amount)}
                    </td>
                    

<td>
  <div className="transaction-actions">
    <button
      type="button"
      className="edit-button"
      onClick={() => handleEditTransaction(transaction)}
    >
      Edit
    </button>

    <button
      type="button"
      className="delete-button"
      onClick={() => handleDeleteTransaction(transaction)}
    >
      Delete
    </button>
  </div>
</td>


                  </tr>
                ))}

                {!loading && visibleTransactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-table">
                      No transactions found. Add your first transaction to
                      get started.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="5" className="empty-table">
                      Loading transactions from MySQL...
                    </td>
                    
                    <td>
  <button
    type="button"
    onClick={() => handleEditTransaction(transaction)}
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => handleDeleteTransaction(transaction)}
  >
    Delete
  </button>
</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <span>© {new Date().getFullYear()} Finora</span>
          <span>Personal finance, made clearer.</span>
        </footer>
        
<section id="budgets" className="budgets-section">
  <div className="section-heading">
    <div>
      <h2>Monthly budgets</h2>
      <p>Track your spending against your limits.</p>
    </div>

    <input
      type="month"
      value={budgetForm.budgetMonth}
      onChange={(event) =>
        setBudgetForm({
          ...budgetForm,
          budgetMonth: event.target.value,
        })
      }
      onBlur={loadBudgets}
      aria-label="Budget month"
    />
  </div>

  <form onSubmit={createBudget} className="budget-form">
    <select
      value={budgetForm.category}
      onChange={(event) =>
        setBudgetForm({
          ...budgetForm,
          category: event.target.value,
        })
      }
      aria-label="Budget category"
    >
      <option value="Food">Food</option>
      <option value="Transport">Transport</option>
      <option value="Shopping">Shopping</option>
      <option value="Bills">Bills</option>
      <option value="Entertainment">Entertainment</option>
      <option value="Health">Health</option>
      <option value="Other">Other</option>
    </select>

    <input
      type="number"
      min="0.01"
      step="0.01"
      required
      placeholder="Monthly limit (₹)"
      value={budgetForm.monthlyLimit}
      onChange={(event) =>
        setBudgetForm({
          ...budgetForm,
          monthlyLimit: event.target.value,
        })
      }
    />

    <button type="submit">Add budget</button>
  </form>

  {budgetError && <p role="alert">{budgetError}</p>}

  {budgetLoading ? (
    <p>Loading budgets...</p>
  ) : budgets.length === 0 ? (
    <p>No budgets found for this month.</p>
  ) : (

<div className="budget-grid">
  {budgets.map((budget) => {
    const limit = Number(budget.monthlyLimit || 0);

    const spent = transactions
      .filter((transaction) => {
        const transactionMonth = String(
          transaction.date || transaction.transactionDate || ""
        ).slice(0, 7);

        return (
          transaction.type === "expense" &&
          String(transaction.category).toLowerCase() ===
            String(budget.category).toLowerCase() &&
          transactionMonth === String(budget.budgetMonth).slice(0, 7)
        );
      })
      .reduce(
        (total, transaction) =>
          total + Math.abs(Number(transaction.amount || 0)),
        0
      );

    const percentage =
      limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

    const remaining = limit - spent;
    const exceeded = spent > limit;

    return (
      <article className="budget-card" key={budget.id}>
        <div className="budget-card-heading">
          <h3>{budget.category}</h3>
          <span>{percentage.toFixed(0)}% used</span>
        </div>

        <p>
          ₹{spent.toLocaleString("en-IN")} spent of ₹
          {limit.toLocaleString("en-IN")}
        </p>

        <div className="budget-progress">
          <div
            className={
              exceeded
                ? "budget-progress-fill exceeded"
                : "budget-progress-fill"
            }
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p>
          Remaining: ₹{remaining.toLocaleString("en-IN")}
        </p>

        {exceeded && (
          <p className="budget-warning">Budget exceeded</p>
        )}
      </article>
    );
  })}
</div>

  )}

<button
  type="button"
  onClick={loadBudgets}
  disabled={budgetLoading}
>
  {budgetLoading ? "Refreshing..." : "Refresh budgets"}
</button>
</section>

      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="transaction-modal-title">Add transaction</h2>
                <p>Record income or an expense in your account.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="form-label">
                Transaction title
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Groceries"
                />
              </label>

              <label className="form-label">
                Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>

              <label className="form-label">
                Amount (₹)
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  placeholder="0.00"
                />
              </label>

              <label className="form-label">
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                Date
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </label>

              <label className="form-label">
                Note (optional)
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Add a note..."
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={saving}
                >
                  <Plus size={17} />
                  {saving ? "Saving..." : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
