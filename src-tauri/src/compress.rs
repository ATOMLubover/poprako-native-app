use std::{io::Cursor, path::PathBuf};

use image::{
    codecs::jpeg::JpegEncoder,
    imageops::{resize, FilterType},
    ImageBuffer, Rgb,
};

const MAX_SIDE: u32 = 3000;
const MAX_BIN_SEARCHES: usize = 6;
const MAX_RESIZE_ITERATIONS: usize = 15;
const REDUCTION_FACTOR: f32 = 0.9;

/// Compresses an image located at `src_path` and saves the compressed image to `dst_path`.
/// The compressed image will not exceed `max_bytes` in size.
#[tracing::instrument(level = "debug")]
pub fn compress_image(
    src_path: PathBuf,
    dst_path: PathBuf,
    max_bytes: usize,
    min_scale: f32,
    min_quality: u8,
) -> Result<(), String> {
    // Prepare the image by converting it to RGB8 format.
    // PNG and JPG are both supported.
    let raw_img =
        image::open(&src_path).map_err(|e| format!("打开图像文件 {:?} 失败：{}", src_path, e))?;

    let img = resize_to_fit(raw_img.to_rgb8());

    drop(raw_img); // Free memory explicitly

    let mut best_buf: Option<Vec<u8>> = None;
    let mut work_buf: Vec<u8> = Vec::with_capacity(max_bytes);

    let mut low = min_quality;
    let mut high = 100u8;

    // First, try to find the best quality using binary search.
    for _ in 0..MAX_BIN_SEARCHES {
        if low > high {
            break;
        }

        let mid = ((low as u16 + high as u16) / 2) as u8;

        encode_with_quality(&img, mid, &mut work_buf)?;

        if work_buf.len() <= max_bytes {
            // Only copy on necessity.
            best_buf = Some(work_buf.clone());

            low = mid + 5;
        } else {
            high = mid - 5;
        }
    }

    // If binary search didn't find a suitable quality, try resizing the image.
    if best_buf.is_none() {
        let mut curr_scale = 1.0;
        let mut curr_img = img;

        for _ in 0..MAX_RESIZE_ITERATIONS {
            curr_scale *= REDUCTION_FACTOR;
            if curr_scale < min_scale {
                return Err("无法在给定的缩放下压缩图像".to_string());
            }

            let (width, height) = curr_img.dimensions();

            let new_width = (width as f32 * REDUCTION_FACTOR) as u32;
            let new_height = (height as f32 * REDUCTION_FACTOR) as u32;

            curr_img = resize(&curr_img, new_width, new_height, FilterType::Triangle);

            encode_with_quality(&curr_img, min_quality, &mut work_buf)?;

            if work_buf.len() <= max_bytes {
                best_buf = Some(work_buf.clone());
                break;
            }
        }
    }

    if best_buf.is_none() {
        return Err("无法在给定的限制下压缩图像".to_string());
    }

    std::fs::write(dst_path, best_buf.unwrap()).map_err(|e| format!("写入压缩图像失败：{}", e))?;

    Ok(())
}

/// Resize a given image to fit within MAX_SIDE while maintaining aspect ratio.
fn resize_to_fit(img: ImageBuffer<Rgb<u8>, Vec<u8>>) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
    let (width, height) = img.dimensions();

    let scale = if width > height {
        MAX_SIDE as f32 / width as f32
    } else {
        MAX_SIDE as f32 / height as f32
    };

    if scale >= 1.0 {
        return img;
    }

    let new_width = (width as f32 * scale) as u32;
    let new_height = (height as f32 * scale) as u32;

    resize(&img, new_width, new_height, FilterType::Triangle)
}

/// Encodes the given image into JPEG format with the specified quality,
/// returning the encoded bytes in memory.
fn encode_with_quality(
    img: &ImageBuffer<Rgb<u8>, Vec<u8>>,
    quality: u8,
    buf: &mut Vec<u8>,
) -> Result<(), String> {
    buf.clear();

    let mut cursor = Cursor::new(buf);

    let mut encoder = JpegEncoder::new_with_quality(&mut cursor, quality);

    encoder
        .encode_image(img)
        .map_err(|e| format!("降低 JPG 质量失败：{}", e))?;

    Ok(())
}
