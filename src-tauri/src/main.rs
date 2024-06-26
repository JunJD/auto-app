#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod write_to_desktop;
use chrono::Local;
use write_to_desktop::{save_qr_code, write_txt, save_excel, ListTableProps};

use std::path::PathBuf;
// use std::sync::atomic::{ Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;
// use tokio::task::spawn_blocking;
// use regex::Regex;
use serde_json::Value;
#[tauri::command]
async fn find_valid_electro_car_by_ids(array: Vec<String>) -> Result<(), String> {
    
    let semaphore = Arc::new(Semaphore::new(5));
    
    let file_lock = Arc::new(Mutex::new(()));
    
    let time = Local::now().format("%Y-%m-%d_%H:%M:%S").to_string();
    
    let mut path: PathBuf = dirs::desktop_dir().ok_or("Unable to find desktop directory")?;
    
    let folder_name = format!("ElectroCarData{}", time);
    
    path.push(&folder_name);
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let txt_file_path: PathBuf = "car_data.txt".into();
    
    path.push(&txt_file_path);
    
    let qr_folder_path = path.with_file_name("qrcode");

    std::fs::create_dir_all(&qr_folder_path)
        .map_err(|e| format!("Failed to create QR folder: {}", e))?;

    for value in array {
      println!("value: {}", value);
        let semaphore = semaphore.clone();
        let file_lock = file_lock.clone();
        // let token = token.clone();
        let txt_file_path = path.clone();
        // 将URL中不适合做路径的字符替换成下划线

        let qr_code_path = qr_folder_path.join(format!("车架号--{}.png", value));

        let _task = tokio::spawn(async move {
          println!("first write_txt: {}", value);
            let permit: tokio::sync::SemaphorePermit = semaphore.acquire().await.unwrap();
            println!("write_txt: {}", value);
            let _ = write_txt(value.clone(), file_lock.clone(), txt_file_path.clone()).await;
            // value 拼接成url
            const URL: &str = "https://www.pzcode.cn/vin/";
            let url = format!("{}{}", URL, value);
            let _ = save_qr_code(&url, file_lock.clone(), qr_code_path.clone()).await;
            drop(permit);
        });
    }
    Ok(())
}

#[tauri::command]
async fn find_battery_nums_by_ids(array: Vec<String>) -> Result<(), String> {
    let semaphore = Arc::new(Semaphore::new(5));
    let file_lock = Arc::new(Mutex::new(()));    
    let time = Local::now().format("%Y-%m-%d_%H:%M:%S").to_string();

    let mut path: PathBuf = dirs::desktop_dir().ok_or("Unable to find desktop directory")?;
    
    let folder_name = format!("BatterData{}", time);
    path.push(&folder_name);

    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;

    
    let txt_file_path: PathBuf = "car_data.txt".into();
    
    path.push(&txt_file_path);
    
    let qr_folder_path = path.with_file_name("qrcode");

    std::fs::create_dir_all(&qr_folder_path)
        .map_err(|e| format!("Failed to create QR folder: {}", e))?;

    for value in array {
        let semaphore = semaphore.clone();
        let file_lock = file_lock.clone();
        // let token = token.clone();
        let txt_file_path = path.clone();
        // 将URL中不适合做路径的字符替换成下划线

        let qr_code_path = qr_folder_path.join(format!("电池码--{}.png", value));

        let _task = tokio::spawn(async move {
            let permit: tokio::sync::SemaphorePermit = semaphore.acquire().await.unwrap();

            let _ = write_txt(value.clone(), file_lock.clone(), txt_file_path.clone()).await;
            // value 拼接成url
            const URL: &str = "https://www.pzcode.cn/pwb/";
            let url = format!("{}{}", URL, value);
            let _ = save_qr_code(&url, file_lock.clone(), qr_code_path.clone()).await;
            drop(permit);
        });
    }
    Ok(())
}


#[tauri::command]
async fn my_generate_excel_command(
    table_data: ListTableProps<serde_json::Value>,
    folder_name_string: String,
    xlsx_file_path_string: String,
) -> Result<String, String> {
    
    let file_lock = Arc::new(Mutex::new(()));

    let time = Local::now().format("%Y_%m_%d_%H_%M_%S").to_string();
    
    // Attempt to find the desktop directory
    let desktop_dir = match dirs::desktop_dir() {
        Some(dir) => dir,
        None => return Err("Unable to find desktop directory".to_string()),
    };

    let mut path: PathBuf = desktop_dir;
    
    let folder_name = format!("{}{}",folder_name_string, time);
    
    path.push(&folder_name);

    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let xlsx_file_path = format!("{}.xlsx",xlsx_file_path_string);
    
    path.push(&xlsx_file_path);
    
    match save_excel(table_data, file_lock, path.clone()).await {
        Ok(_) => {
            Ok(path.to_string_lossy().to_string())
        },
        Err(e) => {
            Err(e)
        },
    }
}

#[tauri::command]
async fn my_generate_qrcode_command(
    table_data: ListTableProps<serde_json::Value>,
    folder_name_string: String,
) -> Result<(), String> {
    let semaphore = Arc::new(Semaphore::new(5));
    let file_lock = Arc::new(Mutex::new(()));    
    let time = Local::now().format("%Y_%m_%d_%H_%M_%S").to_string();

    let mut path: PathBuf = dirs::desktop_dir().ok_or("Unable to find desktop directory")?;
    
    let folder_name = format!("{}{}", folder_name_string, time);
    path.push(&folder_name);

    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let qr_folder_path = path.join("qrcode");

    std::fs::create_dir_all(&qr_folder_path)
        .map_err(|e| format!("Failed to create QR folder: {}", e))?;

    let mut tasks = vec![];

    for (row_num, row) in table_data.data.iter().enumerate() {
        let semaphore = semaphore.clone();
        let file_lock = file_lock.clone();

        let row_value = match serde_json::to_value(&row) {
            Ok(value) => value,
            Err(e) => {
                println!("Failed to serialize row: {}. Skipping row.", e);
                continue;
            }
        };
        
        let cell_value = row_value.get("value").unwrap_or(&Value::Null);

        let url = row_value.get("url").unwrap_or(&Value::Null);
        let qr_code_path = qr_folder_path.join(format!("电池码--{}--{}.png", cell_value, row_num));

        let url_string = url.as_str().unwrap_or("").to_string();
        let cell_value_string = cell_value.as_str().unwrap_or("").to_string();

        let task = tokio::spawn(async move {
            let permit = semaphore.acquire().await.unwrap();
            let full_url = format!("{}{}", url_string, cell_value_string);
            if let Err(e) = save_qr_code(&full_url, file_lock.clone(), qr_code_path.clone()).await {
                eprintln!("Failed to save QR code: {}", e);
            }
            drop(permit);
        });
        tasks.push(task);
    }

    for task in tasks {
        if let Err(e) = task.await {
            return Err(format!("Task failed: {}", e));
        }
    }

    Ok(())
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![my_generate_qrcode_command, find_valid_electro_car_by_ids, find_battery_nums_by_ids, my_generate_excel_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
