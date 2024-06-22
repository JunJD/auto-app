
use std::io::Write;
use std::fs::OpenOptions;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use image::Luma;
use qrcode::QrCode;
use tokio::task::spawn_blocking;

pub async fn write_txt(
    content: String,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("write_txt: {}", &content);
    let result = spawn_blocking(move || {
        let _lock = file_lock.lock().unwrap();
        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(true)
            .open(&path)
            .map_err(|e| format!("Unable to open file: {}", e))?;
        writeln!(file, "{}", content).map_err(|e| format!("Unable to write to file: {}", e))?;
        Ok(path)
    })
    .await;

    result.map_err(|e| format!("Task panicked: {:?}", e))?
}

pub async fn save_qr_code(
    content: &str,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("Saving QR code to {}", path.display());
    let content = content.to_string();
    spawn_blocking(move || {
        let _lock = file_lock.lock().unwrap();

        let code = QrCode::new(&content).map_err(|e| format!("Failed to create QR code: {}", e))?;
        let image = code.render::<Luma<u8>>().build();
        image
            .save(&path)
            .map_err(|e| format!("Failed to save QR code image: {}", e))?;
        Ok(path)
    })
    .await
    .map_err(|e| format!("Task panicked: {:?}", e))?
}