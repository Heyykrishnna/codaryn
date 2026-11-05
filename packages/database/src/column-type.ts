export function expectedColumnType(sqlType: string) {
  const numeric = /^numeric\((\d+),\s*(\d+)\)$/.exec(sqlType);
  if (numeric)
    return {
      udt: "numeric",
      precision: Number(numeric[1]),
      scale: Number(numeric[2]),
    };
  const types: Record<string, string> = {
    text: "text",
    date: "date",
    "text[]": "_text",
    uuid: "uuid",
    bigint: "int8",
    integer: "int4",
    boolean: "bool",
    jsonb: "jsonb",
    "timestamp with time zone": "timestamptz",
  };
  const udt = types[sqlType];
  if (!udt) throw new Error(`Unsupported schema column type: ${sqlType}`);
  return { udt };
}
export function columnTypeMatches(
  sqlType: string,
  actual: {
    udt_name: string;
    numeric_precision: number | null;
    numeric_scale: number | null;
  },
) {
  const expected = expectedColumnType(sqlType);
  return (
    expected.udt === actual.udt_name &&
    (expected.precision === undefined ||
      (expected.precision === actual.numeric_precision &&
        expected.scale === actual.numeric_scale))
  );
}
