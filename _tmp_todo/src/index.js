const express = require("express");
const { router } = require("./routes/todos");

const app = express();
app.use(express.json());
app.use("/todos", router);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Todo API listening on ${port}`));
}

module.exports = { app };
