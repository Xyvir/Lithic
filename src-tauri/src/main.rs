#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::sync::Mutex;
use tauri::Manager;

// State to hold the file path passed by the OS on startup
struct StartupFile(Mutex<Option<String>>);

#[tauri::command]
fn get_startup_file(state: tauri::State<StartupFile>) -> Option<String> {
    let mut file = state.0.lock().unwrap();
    // take() grabs the value and leaves None in its place, 
    // ensuring we only load it once.
    file.take() 
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
  std::env::args().collect()
}

fn main() {
    // Grab command line arguments
    let args: Vec<String> = std::env::args().collect();
    
    // args[0] is the executable path. args[1] will be the .lith file path if opened via Windows Explorer.
    let startup_file = if args.len() > 1 {
        Some(args[1].clone())
    } else {
        None
    };

    tauri::Builder::default()
        // Manage the state so our command can access it
        .manage(StartupFile(Mutex::new(startup_file)))
        // Register the commands to be called from Javascript
        .invoke_handler(tauri::generate_handler![get_startup_file, get_cli_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
