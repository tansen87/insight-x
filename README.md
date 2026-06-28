<h1>insight-x</h1>

### This project will no longer be updated, please refer to [csv wings](https://github.com/tansen87/csv-wings) & [Easy Csv](https://github.com/tansen87/easy-csv).

English | [中文](./README_CN.md)

> insight-x is a Tauri based data processing toolbox designed to simplify data operations and management. It provides an intuitive graphical user interface (GUI). Supports processing of multiple file formats, including Excel, CSV, Parquet, etc. Users can complete complex data processing tasks such as data queries, transformations, merges, joins, sorts, slices, format conversions, etc. through simple operations.


## 📷ScreenShot
* Polars SQL for query
  ![sqlp.gif](/docs/img/sqlp.gif)

* Flow
  ![flow.gif](/docs/img/flow.gif)

* command
  ![cmd.png](/docs/img/cmd.png)


## ✨Features
| Function | Description |
| ------- | ----------- |
| [SQL](./src-tauri/src/lib/cmd/sqlp.rs) | Execute Polars SQL queries against several files (Support Excel, CSV, Parquet, Json, Jsonl) |
| [Flow](./src-tauri/src/lib/flow/mod.rs) | Csv Flow |
| [Apply](./docs/apply.md) | Apply series of string, math transformations to given CSV column/s |
| [Cat](./docs/cat.md) | Merge multiple CSV or Excel files into one CSV or xlsx file (Support Polars and CSV engine) |
| [Convert](./src-tauri/src/lib/cmd/convert/mod.rs) | File type conversion (access to csv, format csv, csv to xlsx, dbf to csv, excel to csv, json to csv, jsonl to csv) |
| [Count](./docs/count.md) | Count the rows of CSV files (Instantaneous with an index) |
| [Rename](./docs/rename.md) | Rename the columns of a CSV |
| [Select](./docs/select.md) | Select, re-order columns |
| [Search](./docs/search.md) | Match the corresponding row in a column (equal, contains, starts with, ends with, regex) |
| [Fill](./docs/fill.md) | Fill empty fields in selected columns of a CSV |
| [Split](./docs/split.md) | Split one CSV file into many CSV files (by rows or by lines, uses multithreading to go faster if an index is present when splitting by rows) |
| [Skip](./docs/skip.md) | Skip rows form CSV |
| [Enumerate](./docs/enumerate.md) | Add a new column enumerating the lines of a CSV file |
| [Pinyin](./docs/pinyin.md) | Convert Chinese to Pinyin for specific column in CSV |
| [Replace](./docs/replace.md) | Replace CSV data using a regex |
| [Join](./docs/join.md) | Joins two sets of CSV data on the specified columns |
| [Sort](./docs/sort.md) | Sorts CSV data lexicographically |
| [Slice](./docs/str_slice.md) | Slicing of CSV column (like polars: left-str.head, right-str.tail, slice-str.slice) |
| [Reverse](./docs/reverse.md) | Reverse order of rows in a CSV |
| [Transpose](./docs/transpose.md) | Transpose rows/columns of a CSV |


## 🍖How to use?
* For more details, please refer to [release](https://github.com/tansen87/insight-x/releases/)


## 🏃‍Runtime Environment
* Node.js 20.19+
* pnpm 10.0+
* 🦀Rust 1.91.1+


## 🚀Development
1. Clone this repositories
   ```bash
   git clone https://github.com/tansen87/insight-x.git
   ```

2. cd to the directory of the project
   ```bash
   cd InsightSQL
   ```

3. Install dependencies
   ```bash
   pnpm i
   ```

4. Development
   ```bash
   pnpm tauri:dev
   ```

5. Build
   ```bash
   pnpm tauri:build
   ```


### video
* [bilibili](https://www.bilibili.com/video/BV1XS411c7zd/?spm_id_from=333.999.0.0&vd_source=5ee5270944c6e7a459e1311330bf455c) (The video hasn't been updated for a long time)
