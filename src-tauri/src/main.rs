#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod write_to_desktop;
use chrono::Local;
use write_to_desktop::{save_qr_code, write_txt};

use std::path::PathBuf;
// use std::sync::atomic::{ Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;
// use tokio::task::spawn_blocking;
// use regex::Regex;

#[tauri::command]
async fn find_valid_electro_car_by_ids(array: Vec<String>) -> Result<(), String> {
    println!("来了老弟！！！");

    
    let semaphore = Arc::new(Semaphore::new(5));
    println!("semaphore 已创建");
    
    let file_lock = Arc::new(Mutex::new(()));
    println!("file_lock 已创建");
    
    let time = Local::now().format("%Y-%m-%d_%H:%M:%S").to_string();
    
    let mut path: PathBuf = dirs::desktop_dir().ok_or("Unable to find desktop directory")?;
    println!("path: {:?}", path);
    
    let folder_name = format!("ElectroCarData{}", time);
    println!("folder_name: {}", folder_name);
    
    path.push(&folder_name);
    println!("path: {:?}", path);
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    println!("path2: {:?}", path);
    
    let txt_file_path: PathBuf = "car_data.txt".into();
    
    path.push(&txt_file_path);
    println!("path3: {:?}", path);
    
    let qr_folder_path = path.with_file_name("qrcode");
    println!("qr_folder_path: {:?}", qr_folder_path);

    std::fs::create_dir_all(&qr_folder_path)
        .map_err(|e| format!("Failed to create QR folder: {}", e))?;
    println!("qr_folder_path: {:?}", qr_folder_path);

    println!("array: {:?}", array);
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![find_valid_electro_car_by_ids])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
