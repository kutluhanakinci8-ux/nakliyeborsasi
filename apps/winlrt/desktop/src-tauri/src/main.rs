#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn cli_open_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| a.ends_with(".ltr") || a.ends_with(".LTR"))
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_text_file, cli_open_paths])
        .run(tauri::generate_context!())
        .expect("WinLRT başlatılamadı");
}
