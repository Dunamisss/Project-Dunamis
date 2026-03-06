import express from "express";
import cors from "cors";
import { routes } from "./routes.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
