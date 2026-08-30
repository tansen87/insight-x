use std::{
  borrow::Cow,
  collections::HashMap,
  fs::File,
  io::{BufReader, BufWriter, Write},
  num::NonZero,
  path::{Path, PathBuf},
  sync::Arc,
  time::Instant,
};

use anyhow::{Result, anyhow};
use polars::{
  io::SerReader,
  prelude::{
    CsvEncoding, CsvWriter, DataFrame, IntoLazy, JsonFormat, JsonReader, JsonWriter, LazyCsvReader,
    LazyFileListReader, LazyFrame, OptFlags, ParquetWriter, PlRefPath, SerWriter,
  },
  sql::SQLContext,
};
use serde::Serialize;

use crate::io::excel::excel_reader::{
  ExcelReader, FastExcelReader, FastToDataFrame, ToPolarsDataFrame,
};
use crate::io::excel::xlsx_writer::XlsxWriter;
use crate::{
  io::csv::options::CsvOptions,
  utils::{EXCEL_MAX_ROW, WTR_BUFFER_SIZE},
};

#[derive(Serialize)]
struct QueryResult {
  data: String,
  schema: HashMap<String, String>,
  columns: Vec<String>,
  /// 结果集总行数(不受limit截断影响)
  total_rows: usize,
  /// 查询耗时(ms)
  elapsed_ms: u128,
}

trait FileWriter {
  fn write_xlsx(&self, df: &DataFrame, output_path: impl AsRef<Path>) -> Result<()>;
  fn write_csv(&self, df: DataFrame, output_path: impl AsRef<Path>) -> Result<()>;
  fn write_parquet(&self, df: DataFrame, output_path: impl AsRef<Path>) -> Result<()>;
  fn write_json(&self, df: DataFrame, output_path: impl AsRef<Path>) -> Result<()>;
  fn write_jsonl(&self, df: DataFrame, output_path: impl AsRef<Path>) -> Result<()>;
}

#[derive(Clone)]
enum OutputFormat {
  Xlsx,
  Csv,
  Parquet,
  Json,
  Jsonl,
}

impl From<&str> for OutputFormat {
  fn from(format: &str) -> Self {
    match format {
      "xlsx" => OutputFormat::Xlsx,
      "csv" => OutputFormat::Csv,
      "parquet" => OutputFormat::Parquet,
      "json" => OutputFormat::Json,
      "jsonl" => OutputFormat::Jsonl,
      _ => OutputFormat::Csv,
    }
  }
}

struct DataFrameWriter {
  format: OutputFormat,
  separator: u8,
}

impl DataFrameWriter {
  pub fn new(format: OutputFormat) -> Self {
    Self {
      format,
      separator: b',',
    }
  }

  fn with_separator(mut self, sep: u8) -> Self {
    self.separator = sep;
    self
  }

  pub fn write_dataframe(&self, df: DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    match (&self.format, df.height() <= EXCEL_MAX_ROW) {
      (OutputFormat::Xlsx, true) => self.write_xlsx(&df, output_path),
      (OutputFormat::Csv, _) => self.write_csv(df, output_path),
      (OutputFormat::Parquet, _) => self.write_parquet(df, output_path),
      (OutputFormat::Json, _) => self.write_json(df, output_path),
      (OutputFormat::Jsonl, _) => self.write_jsonl(df, output_path),
      _ => self.write_csv(df, output_path),
    }
  }
}

impl FileWriter for DataFrameWriter {
  fn write_xlsx(&self, df: &DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    XlsxWriter::new().write_dataframe(&df, output_path.as_ref().to_path_buf())?;
    Ok(())
  }

  fn write_csv(&self, mut df: DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    let file = File::create(output_path)?;
    let mut wtr = BufWriter::with_capacity(WTR_BUFFER_SIZE, file);
    CsvWriter::new(&mut wtr)
      .with_separator(self.separator)
      .with_float_precision(Some(2))
      .finish(&mut df)?;
    Ok(wtr.flush()?)
  }

  fn write_parquet(&self, mut df: DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    let file = File::create(output_path)?;
    let mut wtr = BufWriter::with_capacity(WTR_BUFFER_SIZE, file);
    ParquetWriter::new(&mut wtr)
      .with_row_group_size(Some(768 * 768))
      .finish(&mut df)?;
    Ok(wtr.flush()?)
  }

  fn write_json(&self, mut df: DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    let file = File::create(output_path)?;
    let mut wtr = BufWriter::with_capacity(WTR_BUFFER_SIZE, file);
    JsonWriter::new(&mut wtr)
      .with_json_format(JsonFormat::Json)
      .finish(&mut df)?;
    Ok(wtr.flush()?)
  }

  fn write_jsonl(&self, mut df: DataFrame, output_path: impl AsRef<Path>) -> Result<()> {
    let file = File::create(output_path)?;
    let mut wtr = BufWriter::with_capacity(WTR_BUFFER_SIZE, file);
    JsonWriter::new(&mut wtr)
      .with_json_format(JsonFormat::JsonLines)
      .finish(&mut df)?;
    Ok(wtr.flush()?)
  }
}

async fn prepare_query(
  file_path: Vec<&str>,
  sql_query: String,
  varchar: bool,
  limit: Option<usize>,
  write: bool,
  write_format: &str,
  output_path: String,
  skiprows: usize,
) -> Result<String> {
  let start_time = Instant::now();

  let infer_schema_length = match varchar {
    true => 0,
    false => 10000,
  };

  let ctx = SQLContext::new();

  let mut opt_state = OptFlags::from_bits_truncate(0);
  opt_state |= OptFlags::default();

  let mut lossy_table_name = Cow::default();
  let mut table_name;
  let mut vec_sep = Vec::new();

  for (idx, table) in file_path.iter().enumerate() {
    // as we are using the table name as alias, we need to make sure that the table name is a
    // valid identifier. if its not utf8, we use the lossy version
    table_name = Path::new(table)
      .file_name()
      .and_then(std::ffi::OsStr::to_str)
      .unwrap_or_else(|| {
        lossy_table_name = Path::new(table).to_string_lossy();
        &lossy_table_name
      });

    let file_extension = match Path::new(table).extension() {
      Some(ext) => ext.to_string_lossy().to_lowercase(),
      None => return Err(anyhow!("File extension not found")),
    };

    match file_extension.as_str() {
      "csv" | "tsv" | "psv" | "txt" | "dat" => {
        let opts = CsvOptions::new(table);
        vec_sep.push(opts.detect_separator()?);
      }
      _ => {
        vec_sep.push(b',');
      }
    }

    let lf = match file_extension.as_str() {
      "parquet" => {
        let p: Arc<Path> = Arc::from(PathBuf::from(table));
        LazyFrame::scan_parquet(PlRefPath::try_from_path(&p)?, Default::default())?
      }
      "json" => JsonReader::new(BufReader::new(File::open(table)?))
        .with_json_format(JsonFormat::Json)
        .infer_schema_len(NonZero::new(infer_schema_length))
        .finish()?
        .lazy(),
      "jsonl" => JsonReader::new(BufReader::new(File::open(table)?))
        .with_json_format(JsonFormat::JsonLines)
        .infer_schema_len(NonZero::new(infer_schema_length))
        .finish()?
        .lazy(),
      "xls" | "xlsm" | "xlsb" | "ods" => ExcelReader::from_path(table)?
        .worksheet_range_at(0, skiprows as u32)?
        .to_df()?
        .lazy(),
      "xlsx" => {
        let re = regex::Regex::new(r"limit\s+(\d+)")?;
        let n = re
          .captures(&sql_query.to_lowercase())
          .and_then(|cap| cap.get(1))
          .and_then(|num_match| num_match.as_str().parse::<usize>().ok());

        let df: DataFrame = match n {
          Some(n) => FastExcelReader::from_path(table)?.fast_to_df(n, 0)?,
          None => ExcelReader::from_path(table)?
            .worksheet_range_at(0, skiprows as u32)?
            .to_df()?,
        };
        df.lazy()
      }
      "csv" | "tsv" | "psv" | "txt" | "dat" => {
        let p: Arc<Path> = Arc::from(PathBuf::from(table));
        let csv_reader = LazyCsvReader::new(PlRefPath::try_from_path(&p)?)
          .with_has_header(true)
          .with_missing_is_null(true)
          .with_separator(vec_sep[idx])
          .with_infer_schema_length(Some(infer_schema_length))
          .with_encoding(CsvEncoding::LossyUtf8)
          .with_low_memory(true)
          .with_skip_lines(skiprows)
          .finish()?;

        csv_reader
      }
      _ => {
        return Err(anyhow!("Unsupported file extension: '{}'.", file_extension));
      }
    };

    ctx.register(table_name, lf.with_optimizations(opt_state));
  }

  let mut ctx = ctx.clone();

  let df =
    tokio::task::spawn_blocking(move || -> Result<_> { Ok(ctx.execute(&sql_query)?.collect()?) })
      .await??;

  if write {
    DataFrameWriter::new(write_format.into())
      .with_separator(vec_sep[0])
      .write_dataframe(df, output_path)?;
    Ok("[]".to_string())
  } else {
    let schema = extract_schema(&df);
    let columns: Vec<String> = df
      .get_column_names()
      .iter()
      .map(|s| s.to_string())
      .collect();
    let total_rows = df.height();
    let data_json = match limit {
      Some(n) => query_df_to_json(df.head(Some(n)))?,
      None => query_df_to_json(df)?,
    };

    let res = QueryResult {
      data: data_json,
      schema,
      columns,
      total_rows,
      elapsed_ms: start_time.elapsed().as_millis(),
    };
    Ok(serde_json::to_string(&res)?)
  }
}

fn extract_schema(df: &DataFrame) -> HashMap<String, String> {
  df.schema()
    .iter()
    .map(|(col, dtype)| (col.to_string(), dtype.to_string()))
    .collect()
}

fn query_df_to_json(mut df: DataFrame) -> Result<String> {
  if df == DataFrame::empty() {
    let empty_json = serde_json::json!({});
    return Ok(empty_json.to_string());
  }

  let mut buffer = Vec::new();
  JsonWriter::new(&mut buffer)
    .with_json_format(JsonFormat::Json)
    .finish(&mut df)?;

  Ok(String::from_utf8_lossy(&buffer).to_string())
}

#[tauri::command]
pub async fn query(
  path: String,
  sql_query: String,
  varchar: bool,
  limit: Option<usize>,
  write: bool,
  write_format: String,
  output_path: String,
  skiprows: usize,
) -> Result<String, String> {
  let file_path: Vec<&str> = path.split('|').collect();

  match prepare_query(
    file_path,
    sql_query,
    varchar,
    limit,
    write,
    &write_format,
    output_path,
    skiprows,
  )
  .await
  {
    Ok(result) => Ok(result),
    Err(err) => Err(format!("{err}")),
  }
}
