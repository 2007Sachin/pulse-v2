import express from "express";

const app = express();
const port = process.env.PORT ?? 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`api listening on port ${port}`);
});
