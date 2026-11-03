import { test } from "node:test";
import { strict as assert } from "node:assert";
import { healthResponseSchema } from "@codaryn/contracts";
import { buildApp } from "./app.js";
test("health endpoint returns a validated response", async () => {
    const app = buildApp();
    try {
        const result = await app.inject({ method: "GET", url: "/api/v1/health" });
        assert.equal(result.statusCode, 200);
        assert.equal(healthResponseSchema.safeParse(result.json()).success, true);
    }
    finally {
        await app.close();
    }
});
