/**
 * 轻量 SQL 美化：基于词法扫描，不引入完整的 SQL 解析器。
 * 只处理三种场景：关键字大小写、压缩成单行、按子句展开。
 */

export type SqlFormatMode = "upper" | "compact" | "expand";

const KEYWORDS = [
  "select",
  "from",
  "where",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "offset",
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "full",
  "cross",
  "on",
  "as",
  "and",
  "or",
  "not",
  "null",
  "is",
  "in",
  "like",
  "between",
  "case",
  "when",
  "then",
  "else",
  "end",
  "distinct",
  "union",
  "all",
  "with",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "create",
  "table",
  "view",
  "drop",
  "alter",
  "cast",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "over",
  "partition",
  "asc",
  "desc"
];

const KEYWORD_SET = new Set(KEYWORDS);

/** 需要另起一行的子句关键字 */
const CLAUSE_KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "group",
  "order",
  "having",
  "limit",
  "offset",
  "union",
  "insert",
  "update",
  "delete",
  "values",
  "set"
]);

/** 这些关键字出现时，前面的 join 语义要跟着走，单独处理 */
const JOIN_KEYWORDS = new Set([
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "full",
  "cross"
]);

type TokenType = "word" | "string" | "comment" | "punct" | "space";

interface Token {
  type: TokenType;
  value: string;
}

/** 把 SQL 切成词法单元，字符串与注释内容保持原样 */
function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const pushWord = (start: number) => {
    const value = sql.slice(start, i);
    tokens.push({ type: "word", value });
  };

  while (i < sql.length) {
    const ch = sql[i];

    // 空白
    if (/\s/.test(ch)) {
      const start = i;
      while (i < sql.length && /\s/.test(sql[i])) i += 1;
      tokens.push({ type: "space", value: sql.slice(start, i) });
      continue;
    }

    // 行注释
    if (ch === "-" && sql[i + 1] === "-") {
      const start = i;
      while (i < sql.length && sql[i] !== "\n") i += 1;
      tokens.push({ type: "comment", value: sql.slice(start, i) });
      continue;
    }

    // 块注释
    if (ch === "/" && sql[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i = Math.min(i + 2, sql.length);
      tokens.push({ type: "comment", value: sql.slice(start, i) });
      continue;
    }

    // 单引号字符串（'' 表示转义）
    if (ch === "'") {
      const start = i;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      tokens.push({ type: "string", value: sql.slice(start, i) });
      continue;
    }

    // 双引号标识符
    if (ch === '"') {
      const start = i;
      i += 1;
      while (i < sql.length && sql[i] !== '"') i += 1;
      i = Math.min(i + 1, sql.length);
      tokens.push({ type: "string", value: sql.slice(start, i) });
      continue;
    }

    // 标识符 / 关键字 / 数字
    if (/[\w$]/.test(ch)) {
      const start = i;
      while (i < sql.length && /[\w$.]/.test(sql[i])) i += 1;
      pushWord(start);
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i += 1;
  }

  return tokens;
}

function upperCaseKeywords(tokens: Token[]): Token[] {
  return tokens.map(t =>
    t.type === "word" && KEYWORD_SET.has(t.value.toLowerCase())
      ? { ...t, value: t.value.toUpperCase() }
      : t
  );
}

function joinMeaningful(tokens: Token[]): string {
  let out = "";
  for (const token of tokens) {
    if (token.type === "space" || token.type === "comment") continue;
    const prev = out.slice(-1);
    const needSpace =
      prev !== "" && !/[\s(]/.test(prev) && !/^[),.;]/.test(token.value);
    out += (needSpace ? " " : "") + token.value;
  }
  return out.trim();
}

function expandClauses(tokens: Token[]): string {
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    const text = current.trim();
    if (text) lines.push(text);
    current = "";
  };

  for (let idx = 0; idx < tokens.length; idx += 1) {
    const token = tokens[idx];

    if (token.type === "space") {
      if (current) current += " ";
      continue;
    }

    if (token.type === "comment") {
      flush();
      lines.push(token.value.trim());
      continue;
    }

    const lower = token.value.toLowerCase();

    // join 家族整体换行：LEFT JOIN / INNER JOIN ...
    if (token.type === "word" && JOIN_KEYWORDS.has(lower)) {
      const nextWord = tokens.slice(idx + 1).find(t => t.type === "word");
      const isJoinPhrase =
        lower === "join" || nextWord?.value.toLowerCase() === "join";
      if (isJoinPhrase && current.trim()) {
        flush();
      }
      current += token.value;
      continue;
    }

    if (
      token.type === "word" &&
      CLAUSE_KEYWORDS.has(lower) &&
      current.trim() !== ""
    ) {
      flush();
    }

    current += token.value;
  }

  flush();
  return lines.join("\n");
}

export function formatSql(sql: string, mode: SqlFormatMode): string {
  if (!sql.trim()) return sql;
  const tokens = upperCaseKeywords(tokenize(sql));

  if (mode === "compact") return joinMeaningful(tokens);
  if (mode === "expand") return expandClauses(tokens);

  // upper：只改关键字大小写，保留原有换行
  return tokens.map(t => t.value).join("");
}
