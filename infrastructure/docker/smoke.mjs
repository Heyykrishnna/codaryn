import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
const [apiImage = "codaryn-api:ci", webImage = "codaryn-web:ci"] =
  process.argv.slice(2);
assert.match(apiImage, /^codaryn-api:(?:ci|phase14)$/);
assert.match(webImage, /^codaryn-web:(?:ci|phase14)$/);
function docker(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 30000,
  });
  return { ok: result.status === 0, output: result.stdout?.trim() ?? "" };
}
for (const [kind, image] of [
  ["api", apiImage],
  ["web", webImage],
]) {
  const name = `codaryn-release-smoke-${randomUUID()}`;
  const fixture =
    kind === "api"
      ? [
          "NODE_ENV=production",
          "DATABASE_URL=postgres://codaryn:fixture@127.0.0.1:1/unavailable",
          "AUTH_SECRET=release-smoke-fixture-32-characters-or-more",
          "AUTH_BASE_URL=https://codaryn.example",
          "WEB_ORIGIN=https://codaryn.example",
          "GITHUB_CLIENT_ID=fixture",
          "GITHUB_CLIENT_SECRET=fixture",
        ].flatMap((value) => ["-e", value])
      : [];
  try {
    assert.ok(
      docker([
        "run",
        "--rm",
        "-d",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--memory",
        "768m",
        "--cpus",
        "1",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "--tmpfs",
        "/tmp:size=67108864,mode=1777",
        ...(kind === "web"
          ? ["--tmpfs", "/app/apps/web/.next/cache:size=67108864,mode=1777"]
          : []),
        ...fixture,
        image,
      ]).ok,
      `${kind} container failed to start`,
    );
    let ready = false;
    for (let attempt = 0; attempt < 30 && !ready; attempt++) {
      const path =
        kind === "api"
          ? "http://127.0.0.1:4000/api/v1/health"
          : "http://127.0.0.1:3000/docs";
      ready = docker([
        "exec",
        name,
        "node",
        "-e",
        `fetch(${JSON.stringify(path)},{signal:AbortSignal.timeout(1500)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
      ]).ok;
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, `${kind} image did not serve its smoke route`);
    if (kind === "web")
      assert.ok(
        docker([
          "exec",
          name,
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/guide.txt').then(async r=>process.exit(r.ok&&r.headers.get('x-frame-options')==='DENY'&&r.headers.get('content-security-policy')?.includes('frame-ancestors')&&(await r.text()).startsWith('codaryn workspace guide')?0:1)).catch(()=>process.exit(1))",
        ]).ok,
      );
    if (kind === "api")
      assert.ok(
        docker([
          "exec",
          name,
          "node",
          "-e",
          "fetch('http://127.0.0.1:4000/api/v1/ready').then(r=>process.exit(r.status===503?0:1)).catch(()=>process.exit(1))",
        ]).ok,
      );
    console.log(
      JSON.stringify({
        qualification: "runtime-smoke",
        image,
        status: "passed",
        network: "none",
        readOnly: true,
        liveCredentials: false,
      }),
    );
  } finally {
    const removed = docker(["rm", "-f", name]);
    if (!removed.ok)
      console.error(
        "Unable to remove the disposable smoke container; inspect Docker containers",
      );
  }
}
