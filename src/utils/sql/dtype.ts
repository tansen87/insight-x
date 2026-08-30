/** Polars dtype 的展示辅助：类型徽标与数值判定 */

const NUMERIC_DTYPES = new Set([
  "i8",
  "i16",
  "i32",
  "i64",
  "u8",
  "u16",
  "u32",
  "u64",
  "f32",
  "f64",
  "int",
  "float",
  "double",
  "decimal"
]);

export function isNumericDtype(dtype?: string): boolean {
  const d = (dtype || "").toLowerCase();
  if (NUMERIC_DTYPES.has(d)) return true;
  if (!d) return false;
  // Polars 的 dtype 字符串形如 Int64 / Float64 / UInt32
  return /(^|\W)(u?int|float|decimal|double)\d*/i.test(d);
}

/** 列头/字段节点上显示的极短类型标识 */
export function dtypeToken(dtype?: string): string {
  const d = (dtype || "").toLowerCase();
  if (!d) return "?";
  if (isNumericDtype(d)) return "#";
  if (
    d.includes("str") ||
    d.includes("utf8") ||
    d.includes("categor") ||
    d.includes("object")
  ) {
    return "T";
  }
  if (d.includes("bool")) return "B";
  if (d.includes("date") || d.includes("time") || d.includes("duration")) {
    return "D";
  }
  if (d.includes("list") || d.includes("struct")) return "[]";
  return "?";
}
