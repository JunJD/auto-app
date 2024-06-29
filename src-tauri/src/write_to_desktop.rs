use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use image::Luma;
use qrcode::QrCode;
use rusttype::{Font, Scale};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::task::spawn_blocking;
use xlsxwriter::format::FormatAlignment;
use xlsxwriter::{Format, Workbook};
use image::{ DynamicImage, RgbaImage, Rgba};
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

pub async fn save_qr_code_with_text(
    content: &str,
    file_lock: Arc<Mutex<()>>,
    path: PathBuf,
) -> Result<PathBuf, String> {
    println!("Saving QR code to {}", path.display());
    let content = content.to_string();
    spawn_blocking(move || {
        let _lock = file_lock.lock().unwrap();
        let url = format!("https://www.pzcode.cn/pwb/{}", content);

        // Create QR code
        let code = QrCode::new(&url)
            .map_err(|e| format!("Failed to create QR code: {}", e))?;
        
        // Render QR code to image
        let qr_image = code.render::<Luma<u8>>().build();

        // Create a new image with extra space for the text
        let text_height = 40; // Adjust as necessary
        let width = qr_image.width();
        let height = qr_image.height() + text_height;
        let mut final_image = RgbaImage::new(width, height);

        // Copy QR code to final image
        for y in 0..qr_image.height() {
            for x in 0..qr_image.width() {
                let pixel = qr_image.get_pixel(x, y);
                final_image.put_pixel(x, y, Rgba([pixel[0], pixel[0], pixel[0], 255]));
            }
        }

        // Draw background for text area
        let text_background_color = Rgba([255, 255, 255, 255]); // White background
        for y in qr_image.height()..height {
            for x in 0..width {
                final_image.put_pixel(x, y, text_background_color);
            }
        }

        // Load font
        let font_data = include_bytes!("./DejaVuSerif.ttf");
        let font = Font::try_from_bytes(font_data as &[u8]).unwrap();

        // Draw text below the QR code using default font
        let scale = Scale { x: 20.0, y: 20.0 };
        let text_color = Rgba([0, 0, 0, 255]); // Black text
        let v_metrics = font.v_metrics(scale);
        let glyphs: Vec<_> = font.layout(&content, scale, rusttype::point(0.0, v_metrics.ascent)).collect();

        // Draw the glyphs with opaque background
        for glyph in glyphs {
            if let Some(bounding_box) = glyph.pixel_bounding_box() {
                glyph.draw(|x, y, v| {
                    let x = x as i32 + bounding_box.min.x;
                    let y = y as i32 + bounding_box.min.y + qr_image.height() as i32;
                    if x >= 0 && x < final_image.width() as i32 && y >= 0 && y < final_image.height() as i32 {
                        let pixel = final_image.get_pixel_mut(x as u32, y as u32);
                        let alpha = (v * 255.0) as u8;
                        let bg_pixel = Rgba([255, 255, 255, 255]); // White background
                        let text_pixel = Rgba([
                            text_color[0],
                            text_color[1],
                            text_color[2],
                            alpha,
                        ]);
                        *pixel = if alpha > 0 { text_pixel } else { bg_pixel }; // If text pixel has alpha, use text pixel else use background pixel
                    }
                });
            }
        }

        // Save the final image to the specified path
        DynamicImage::ImageRgba8(final_image).save(&path)
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
