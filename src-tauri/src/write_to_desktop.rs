use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use image::Luma;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use tokio::task::spawn_blocking;
use xlsxwriter::format::FormatAlignment;
use xlsxwriter::{Format, Workbook};

#[derive(Serialize, Deserialize, Debug)]
pub struct Column {
    key: String,
    label: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListTableProps<T> {
    data: Vec<T>,
    columns: Vec<Column>,
}

pub async fn write_txt(
    content: String,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("write_txt: {}", &content);
    let result = spawn_blocking(move || {
        // let _lock = file_lock.lock().unwrap();
        let _lock = file_lock
            .lock()
            .map_err(|e| format!("Failed to lock file: {}", e))?;
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

pub async fn save_excel<T: serde::ser::Serialize + Send + 'static>(
    table_data: ListTableProps<T>,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("Saving Excel file to {}", path.display());
    spawn_blocking(move || {
        let _lock = file_lock.lock().unwrap();

        let path_str = path.to_string_lossy().into_owned(); // 保存临时值

        let workbook =
            Workbook::new(&path_str).map_err(|e| format!("Failed to create workbook: {}", e))?;
        let mut sheet = workbook
            .add_worksheet(Some("Sheet1"))
            .map_err(|e| format!("Failed to add worksheet: {}", e))?;

        // Create format for the header
        let mut header_format = Format::new();
        header_format.set_bold().set_align(FormatAlignment::Center);

        // Write column headers
        for (col_num, column) in table_data.columns.iter().enumerate() {
            sheet
                .write_string(0, col_num as u16, &column.label, Some(&header_format))
                .map_err(|e| format!("Failed to write header: {}", e))?;
        }

        // Write table data
        for (row_num, row) in table_data.data.iter().enumerate() {
            // let row_value = serde_json::to_value(&row).unwrap(); // 绑定临时值
            let row_value = serde_json::to_value(&row)
                .map_err(|e| format!("Failed to serialize row: {}", e))?;
            for (col_num, column) in table_data.columns.iter().enumerate() {
                let cell_value = row_value.get(&column.key).ok_or_else(|| format!("Missing key in row: {}", column.key))?;
                // let cell_value = row_value.get(&column.key).unwrap();
                match cell_value {
                    serde_json::Value::String(s) => sheet
                        .write_string((row_num + 1) as u32, col_num as u16, s, None)
                        .map_err(|e| format!("Failed to write cell: {}", e))?,
                    // serde_json::Value::Number(n) => sheet.write_number((row_num + 1) as u32, col_num as u16, n.as_f64().unwrap(), None)
                    //     .map_err(|e| format!("Failed to write cell: {}", e))?,
                    serde_json::Value::Number(n) => n
                        .as_f64()
                        .ok_or_else(|| format!("Invalid number value: {}", n))
                        .and_then(|f| {
                            sheet
                                .write_number((row_num + 1) as u32, col_num as u16, f, None)
                                .map_err(|e| format!("Failed to write cell: {}", e))
                        })?,
                    _ => return Err(format!("Unsupported data type in cell: {:?}", cell_value)),
                }
            }
        }

        workbook
            .close()
            .map_err(|e| format!("Failed to close workbook: {}", e))?;
        Ok(path)
    })
    .await
    .map_err(|e| format!("Task panicked: {:?}", e))?
}
