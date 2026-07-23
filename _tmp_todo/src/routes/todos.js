const { Router } = require("express");

const router = Router();
/** @type {{ id: number, title: string, done: boolean }[]} */
const todos = [];
let nextId = 1;

function validateTodoBody(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") {
    const err = new Error("Request body must be a JSON object");
    err.status = 400;
    throw err;
  }
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      const err = new Error("title is required and must be a non-empty string");
      err.status = 400;
      throw err;
    }
  }
  if (body.done !== undefined && typeof body.done !== "boolean") {
    const err = new Error("done must be a boolean");
    err.status = 400;
    throw err;
  }
}

router.get("/", (_req, res) => {
  res.json(todos);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json(todo);
});

router.post("/", (req, res, next) => {
  try {
    validateTodoBody(req.body);
    const todo = {
      id: nextId++,
      title: req.body.title.trim(),
      done: Boolean(req.body.done),
    };
    todos.push(todo);
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    validateTodoBody(req.body, { partial: true });
    if (req.body.title !== undefined) todo.title = req.body.title.trim();
    if (req.body.done !== undefined) todo.done = req.body.done;
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }
  const [removed] = todos.splice(idx, 1);
  res.json(removed);
});

module.exports = { router };
