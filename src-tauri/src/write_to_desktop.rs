use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use image::Luma;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::task::spawn_blocking;
use xlsxwriter::format::FormatAlignment;
use xlsxwriter::{Format, Workbook};

#[derive(Serialize, Deserialize, Debug)]
pub struct Column {
    pub key: String,
    pub label: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListTableProps<T> {
    pub data: Vec<T>,
    pub columns: Vec<Column>,
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
        let url = format!("https://www.pzcode.cn/pwb/{}", content);
        let code = QrCode::new(&url).map_err(|e| format!("Failed to create QR code: {}", e))?;
        let image = code.render::<Luma<u8>>().build();
        image
            .save(&path)
            .map_err(|e| format!("Failed to save QR code image: {}", e))?;
        Ok(path)
    })
    .await
    .map_err(|e| format!("Task panicked: {:?}", e))?
}

pub async fn save_excel<T: Serialize + Send + 'static>(
    table_data: ListTableProps<T>,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("Saving Excel file to {}", path.display());
    spawn_blocking(move || {
        let _lock = file_lock.lock().unwrap();

        let path_str = path.to_string_lossy().into_owned();

        let workbook = Workbook::new(&path_str)
            .map_err(|e| format!("Failed to create workbook: {}", e))?;
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
            let row_value = match serde_json::to_value(&row) {
                Ok(value) => value,
                Err(e) => {
                    println!("Failed to serialize row: {}. Skipping row.", e);
                    continue;
                }
            };
            for (col_num, column) in table_data.columns.iter().enumerate() {
                let cell_value = row_value.get(&column.key).unwrap_or(&Value::Null);
                match cell_value {
                    Value::String(s) => {
                        if let Err(e) = sheet.write_string((row_num + 1) as u32, col_num as u16, s, None) {
                            println!("Failed to write cell: {}. Skipping cell.", e);
                        }
                    }
                    Value::Number(n) => {
                        if let Some(f) = n.as_f64() {
                            if let Err(e) = sheet.write_number((row_num + 1) as u32, col_num as u16, f, None) {
                                println!("Failed to write cell: {}. Skipping cell.", e);
                            }
                        } else {
                            println!("Invalid number value: {}. Skipping cell.", n);
                        }
                    }
                    Value::Null => {
                        // Do nothing, leave the cell empty
                    }
                    _ => {
                        println!("Unsupported data type in cell: {:?}. Skipping cell.", cell_value);
                    }
                }
            }
        }

        workbook.close().map_err(|e| format!("Failed to close workbook: {}", e))?;
        Ok(path)
    })
    .await
    .map_err(|e| format!("Task panicked: {:?}", e))?
}
