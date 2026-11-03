import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";

export function validSignature(
  secret: string,
  payload: Buffer,
  signature: string,
) {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
export async function receiveWebhook(
  pool: Pool,
  secret: string,
  payload: Buffer,
  signature: string,
  event: string,
  delivery: string,
) {
  if (!validSignature(secret, payload, signature))
    throw new Error("INVALID_SIGNATURE");
  z.uuid().parse(delivery);
  z.string().min(1).max(100).parse(event);
  const body = z
    .object({
      action: z.string().optional(),
      installation: z
        .object({ id: z.number().int().positive().safe() })
        .optional(),
      repositories_removed: z
        .array(z.object({ id: z.number().int().positive().safe() }))
        .max(5000)
        .optional(),
      repository: z
        .object({ id: z.number().int().positive().safe() })
        .optional(),
    })
    .parse(JSON.parse(payload.toString("utf8")));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO github_webhook_events (delivery_id,event) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING delivery_id",
      [delivery, event],
    );
    if (!inserted.rowCount) {
      await client.query("COMMIT");
      return { duplicate: true };
    }
    const id = body.installation?.id;
    if (
      id &&
      ["installation", "installation_repositories", "repository"].includes(
        event,
      )
    ) {
      const disconnected =
        event === "installation" &&
        ["deleted", "suspend", "new_permissions_accepted"].includes(
          body.action ?? "",
        );
      await client.query(
        "UPDATE github_installations SET generation=generation+1,connected=CASE WHEN $2 THEN false ELSE connected END,updated_at=now() WHERE id=$1",
        [id, disconnected],
      );
      if (disconnected)
        await client.query(
          "UPDATE connected_repositories SET active=false WHERE installation_id=$1",
          [id],
        );
      await client.query(
        "UPDATE connected_repositories SET active=false WHERE installation_id=$1 AND github_id=ANY($2::bigint[])",
        [
          id,
          (body.repositories_removed ?? []).map((repository) => repository.id),
        ],
      );
      if (
        event === "repository" &&
        body.action === "deleted" &&
        body.repository
      )
        await client.query(
          "UPDATE connected_repositories SET active=false WHERE installation_id=$1 AND github_id=$2",
          [id, body.repository.id],
        );
    }
    await client.query("COMMIT");
    return { duplicate: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
