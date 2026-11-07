type Assertion = { name: string; status: number };

const statusTest =
  /^pm\.test\(("(?:[^"\\]|\\.)*"),\s*(?:\(\)\s*=>|function\s*\(\))\s*\{\s*pm\.response\.to\.have\.status\(([1-5]\d\d)\);?\s*\}\);?$/;

export function parseStatusTests(script: string): Assertion[] {
  if (script.length > 4096) throw new Error("Use at most 4 KiB of assertions.");
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 20) throw new Error("Use at most 20 status assertions.");
  return lines.map((line, index) => {
    const match = statusTest.exec(line);
    if (!match)
      throw new Error(
        `Assertion ${index + 1} must use pm.test with pm.response.to.have.status.`,
      );
    const name: unknown = JSON.parse(match[1]);
    if (typeof name !== "string" || !name.trim())
      throw new Error(`Assertion ${index + 1} needs a name.`);
    return { name, status: Number(match[2]) };
  });
}

export function statusTestResults(assertions: Assertion[], status: number) {
  return assertions.map((assertion) => ({
    name: assertion.name,
    expected: assertion.status,
    actual: status,
    passed: assertion.status === status,
  }));
}
