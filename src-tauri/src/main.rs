#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use insight::command;
use insight::sql;

use insight::cmd::apply;
use insight::cmd::cat;
use insight::cmd::convert;
use insight::cmd::count;
use insight::cmd::datefmt;
use insight::cmd::enumerate;
use insight::cmd::extsort;
use insight::cmd::fill;
use insight::cmd::idx;
use insight::cmd::insert;
use insight::cmd::join;
use insight::cmd::pinyin;
use insight::cmd::rename;
use insight::cmd::replace;
use insight::cmd::reverse;
use insight::cmd::search;
use insight::cmd::select;
use insight::cmd::separate;
use insight::cmd::skip;
use insight::cmd::slice;
use insight::cmd::sort;
use insight::cmd::split;
use insight::cmd::string;
use insight::cmd::transpose;
use insight::cmd::traverse;

fn main() {
  #[cfg(debug_assertions)]
  {
    use std::io::Write;

    env_logger::Builder::new()
      .filter_module("insight", log::LevelFilter::Debug)
      .format(|buf, record| {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        writeln!(
          buf,
          "[{} {} {}] {}",
          now,
          record.level(),
          record.target(),
          record.args()
        )
      })
      .init();
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      command::from_headers,
      command::map_headers,
      command::inter_headers,
      command::dupli_headers,
      command::to_json,
      apply::apply,
      cat::concat,
      convert::excel_to_csv::map_excel_sheets,
      #[cfg(target_os = "windows")]
      convert::perform::access2csv,
      convert::perform::csv2csv,
      convert::perform::encoding2utf8,
      convert::perform::csv2xlsx,
      convert::perform::dbf2csv,
      convert::perform::excel2csv,
      convert::perform::json2csv,
      convert::perform::jsonl2csv,
      count::count,
      datefmt::datefmt,
      enumerate::enumer,
      extsort::extsort,
      fill::fill,
      idx::csv_idx,
      insert::insert,
      join::join,
      pinyin::pinyin,
      rename::rename,
      replace::replace,
      reverse::reverse,
      search::perform::search,
      search::perform::search_chain,
      select::select,
      separate::separate,
      skip::skip,
      slice::slice,
      sort::sort,
      split::split,
      sql::sqlp::query,
      string::str_pad,
      string::str_slice,
      string::str_split,
      transpose::transpose,
      traverse::traverse,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
