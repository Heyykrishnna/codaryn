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
test("configuration validation accepts supported input and rejects invalid input", async () => {
    const app = buildApp();
    try {
        const valid = await app.inject({
            method: "POST",
            url: "/api/v1/analysis-configurations/validate",
            payload: {
                depth: "standard",
                includeTests: true,
                excludeGenerated: true,
            },
        });
        assert.equal(valid.statusCode, 200);
        assert.deepEqual(valid.json().configuration, {
            depth: "standard",
            includeTests: true,
            excludeGenerated: true,
        });
        const invalid = await app.inject({
            method: "POST",
            url: "/api/v1/analysis-configurations/validate",
            payload: {
                depth: "unknown",
                includeTests: "true",
                excludeGenerated: true,
            },
        });
        assert.equal(invalid.statusCode, 400);
        assert.equal(invalid.json().error.code, "INVALID_CONFIGURATION");
    }
    finally {
        await app.close();
    }
});
