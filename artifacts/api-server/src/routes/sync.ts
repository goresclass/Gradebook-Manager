import { db, syncRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router } from "express";

const router = Router();

const SYNC_CODE_RE = /^[A-Z0-9]{4,12}$/;

router.get("/sync/:code", async (req, res) => {
  const { code } = req.params;
  if (!SYNC_CODE_RE.test(code.toUpperCase())) {
    res.status(400).json({ error: "Invalid sync code" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(syncRecordsTable)
      .where(eq(syncRecordsTable.syncCode, code.toUpperCase()))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "No backup found for this sync code" });
      return;
    }

    res.json({ data: rows[0].data, updatedAt: rows[0].updatedAt });
  } catch (err) {
    req.log.error({ err }, "Failed to retrieve sync record");
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/sync/:code", async (req, res) => {
  const { code } = req.params;
  if (!SYNC_CODE_RE.test(code.toUpperCase())) {
    res.status(400).json({ error: "Invalid sync code — use 4-12 uppercase letters/numbers" });
    return;
  }

  const { payload } = req.body as { payload?: Record<string, unknown> };
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "Missing payload" });
    return;
  }

  try {
    await db
      .insert(syncRecordsTable)
      .values({ syncCode: code.toUpperCase(), data: payload })
      .onConflictDoUpdate({
        target: syncRecordsTable.syncCode,
        set: {
          data: payload,
          updatedAt: new Date(),
        },
      });

    res.json({ ok: true, syncCode: code.toUpperCase() });
  } catch (err) {
    req.log.error({ err }, "Failed to save sync record");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
