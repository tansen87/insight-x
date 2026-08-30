/**
 * Ace 的 SQL 自动补全：数据源来自前端已缓存的 schema（sqlHistory.dtypesByFile）
 * 补全表名（不含引号，适配 `from "xxx.csv"` 的写法）、字段名与常用关键字
 */

export interface SqlCompletionSource {
  /** 表名，通常是带扩展名的文件名 */
  name: string;
  fields: { name: string; dtype?: string }[];
}

interface AceCompletion {
  name: string;
  value: string;
  score: number;
  meta: string;
  snippet?: string;
}

/** 输入 sel / cnt / grp 时提供的语句片段 */
const SNIPPETS: AceCompletion[] = [
  {
    name: "sel",
    value: "sel",
    snippet: 'select *\nfrom "${1:filename}"\nlimit 100',
    score: 800,
    meta: "snippet"
  },
  {
    name: "cnt",
    value: "cnt",
    snippet: 'select count(*) as cnt\nfrom "${1:filename}"',
    score: 800,
    meta: "snippet"
  },
  {
    name: "grp",
    value: "grp",
    snippet:
      'select "${1:column}", count(*) as cnt\nfrom "${2:filename}"\ngroup by "${1:column}"\norder by cnt desc',
    score: 800,
    meta: "snippet"
  }
];

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "LEFT JOIN",
  "INNER JOIN",
  "CROSS JOIN",
  "ON",
  "AS",
  "AND",
  "OR",
  "NOT",
  "IS NULL",
  "IS NOT NULL",
  "IN",
  "LIKE",
  "BETWEEN",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "DISTINCT",
  "UNION ALL",
  "UNION",
  "WITH",
  "CAST",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "OVER",
  "PARTITION BY",
  "ASC",
  "DESC"
];

/** `from "` 或 `join "` 之后只补表名 */
const TABLE_CONTEXT = /(?:from|join)\s+"[^"]*$/i;

function buildFieldCompletions(
  sources: SqlCompletionSource[]
): AceCompletion[] {
  const seen = new Set<string>();
  const list: AceCompletion[] = [];

  for (const source of sources) {
    for (const field of source.fields) {
      if (seen.has(field.name)) continue;
      seen.add(field.name);
      list.push({
        name: field.name,
        value: field.name,
        score: 900,
        meta: field.dtype || "column"
      });
    }
  }
  return list;
}

export function createSqlCompleter(getSources: () => SqlCompletionSource[]): {
  getCompletions: (...args: any[]) => void;
} {
  return {
    getCompletions(
      editor: any,
      session: any,
      pos: any,
      prefix: string,
      callback: any
    ) {
      const sources = getSources();

      const line = session.getLine(pos.row).slice(0, pos.column);
      if (TABLE_CONTEXT.test(line)) {
        const typed = /"([^"]*)$/.exec(line)?.[1]?.toLowerCase() ?? "";
        const tables = sources
          .filter(s => s.name.toLowerCase().includes(typed))
          .map(s => ({
            name: s.name,
            value: s.name,
            score: 1000,
            meta: `${s.fields.length} columns`
          }));
        callback(null, tables);
        return;
      }

      const lowerPrefix = (prefix || "").toLowerCase();
      const fields = buildFieldCompletions(sources).filter(f =>
        lowerPrefix ? f.name.toLowerCase().startsWith(lowerPrefix) : true
      );
      const keywords = SQL_KEYWORDS.filter(k =>
        lowerPrefix ? k.toLowerCase().startsWith(lowerPrefix) : true
      ).map(k => ({
        name: k,
        value: k,
        score: 100,
        meta: "keyword"
      }));

      const snippets = SNIPPETS.filter(s =>
        lowerPrefix ? s.name.startsWith(lowerPrefix) : true
      );

      callback(null, [...snippets, ...fields.slice(0, 200), ...keywords]);
    }
  };
}
