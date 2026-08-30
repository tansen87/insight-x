<h1>insight-x</h1>

### 此项目不再更新,请参考 [csv wings](https://github.com/tansen87/csv-wings) & [Easy Csv](https://github.com/tansen87/easy-csv).

[English](./README.md) | 中文

> insight-x是一个基于Tauri的数据处理工具箱，旨在简化数据操作和管理。它提供了一个直观的图形用户界面(GUI)。支持多种文件格式的处理，包括 Excel、CSV 和 Parquet 等。用户可以通过简单的操作完成复杂的数据处理任务，如数据查询、转换、合并、连接、排序、切片、格式转换等。


## 📷截图
* Polars SQL for query
  ![sqlp.gif](/docs/img/sqlp.gif)

* command
  ![cmd.png](/docs/img/cmd.png)


## ✨Features
| Function | Description |
| ------- | ----------- |
| [SQL](./src-tauri/src/lib/cmd/sqlp.rs) | 对多个文件执行Polars SQL查询 (支持Excel, CSV, Parquet, Json, Jsonl) |
| [Apply](./docs/apply.md) | 对CSV的列操作 |
| [Cat](./docs/cat.md) | 将多个CSV或Excel文件合并为一个CSV或xlsx文件 |
| [Convert](./src-tauri/src/lib/cmd/convert/mod.rs) | 文件类型转换 (access转csv, 格式化csv, csv转xlsx, dbf转csv, excel转csv, json转csv, jsonl转csv) |
| [Count](./docs/count.md) | 统计CSV文件的行数 (带索引的瞬时值) |
| [Rename](./docs/rename.md) | 重命名CSV的列 |
| [Select](./docs/select.md) | 选择、重新排序CSV的列 |
| [Search](./docs/search.md) | 匹配列中的相应行 (包含模式: equal, contains, starts with, ends with, regex) |
| [Fill](./docs/fill.md) | 填充CSV中的空值 |
| [Split](./docs/split.md) | 将一个CSV文件拆分为多个CSV文件 (按rows或按lines拆,如果按rows拆分时存在索引,则使用多线程来加快速度;按lines拆忽略分割符,适用于非标准text文件) |
| [Skip](./docs/skip.md) | 跳过CSV中的行 |
| [Enumerate](./docs/enumerate.md) | 添加一个新列,枚举CSV文件的行 (添加索引列) |
| [Pinyin](./docs/pinyin.md) | 中文转换为拼音 |
| [Replace](./docs/replace.md) | 使用正则表达式替换CSV数据 |
| [Join](./docs/join.md) | 在指定列上连接两组CSV数据,可参考SQL的join |
| [Sort](./docs/sort.md) | 对CSV排序 |
| [Slice](./docs/str_slice.md) | CSV列的切片 (如polars: left-str.head, right-str.tail, slice-str.slice) |
| [Reverse](./docs/reverse.md) | 颠倒CSV的行 |
| [Transpose](./docs/transpose.md) | CSV行列转换,可参考Excel的transpose |

## 🍖如何使用?
* 详细可查看[release](https://github.com/tansen87/insight-x/releases/)


## 🏃‍运行环境
* Node.js 20.19+
* pnpm 10.0+
* Rust 1.91.0+


## 🚀开发
1. 克隆该仓库
   ```bash
   git clone https://github.com/tansen87/insight-x.git
   ```

2. cd到该项目的路径
   ```bash
   cd InsightSQL
   ```

3. 安装依赖
   ```bash
   pnpm i
   ```

4. 开发
   ```bash
   pnpm tauri:dev
   ```

5. 打包
   ```bash
   pnpm tauri:build
   ```


### 演示视频
* [bilibili](https://www.bilibili.com/video/BV1XS411c7zd/?spm_id_from=333.999.0.0&vd_source=5ee5270944c6e7a459e1311330bf455c) (视频很久未更新了)
