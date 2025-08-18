import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

const PORT = process.env.HUB_PORT || 4800;
app.listen(PORT, () => {
  console.log(`[pos-server] listening on ${PORT}`);
});
