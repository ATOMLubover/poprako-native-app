use std::io;

use crate::model::project::PortProject;

pub enum Format {
    PopRaKo,
    LabelPlus,
}

pub fn encode_project(
    write: &mut impl io::Write,
    project: &PortProject,
    format: Format,
) -> anyhow::Result<()> {
    match format {
        Format::PopRaKo => {
            // Encode using JSON format.
            serde_json::to_writer_pretty(write, project)?;
        }
        Format::LabelPlus => {
            // Encode using LabelPlus format.
            encode_labelplus(write, project)?;
        }
    }

    Ok(())
}

fn encode_labelplus(write: &mut impl io::Write, project: &PortProject) -> anyhow::Result<()> {
    // Header: version number
    writeln!(write, "1,0")?;
    writeln!(write, "-")?;

    // Header: group list (inbox, outbox)
    writeln!(write, "框内")?;
    writeln!(write, "框外")?;
    writeln!(write, "-")?;

    // Header: user note group name
    writeln!(write, "Exported by PopRaKo Native")?;
    writeln!(write)?;

    // Body: iterate over pages
    for page in &project.pages {
        writeln!(write)?;
        writeln!(write, ">>>>>>>>[{}]<<<<<<<<", page.image_filename)?;

        // 按 index_in_page 排序 units
        let mut sorted_units = page.units.clone();
        sorted_units.sort_by_key(|u| u.index_in_page);

        // 输出每个 unit
        for (i, unit) in sorted_units.iter().enumerate() {
            let n = i + 1;
            let g = if unit.is_inbox { 1 } else { 2 };

            // Format coordinates to avoid scientific notation (4 decimal places)
            writeln!(
                write,
                "----------------[{}]----------------[{:.4},{:.4},{}]",
                n, unit.x, unit.y, g
            )?;

            // Select main text: prooved_text || translated_text
            let main_text = unit
                .prooved_text
                .as_ref()
                .filter(|s| !s.is_empty())
                .or(unit.translated_text.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("");

            // Write main text
            if !main_text.is_empty() {
                writeln!(write, "{}", main_text)?;
            }

            // If there is a comment, append it using the agreed format
            if let Some(comment) = &unit.comment {
                if !comment.is_empty() {
                    writeln!(write)?;
                    writeln!(write, "#[翻校注释]：{}", comment)?;
                }
            }

            writeln!(write)?;
        }
    }

    Ok(())
}

pub fn decode_export_project(
    read: &mut impl io::Read,
    format: Format,
) -> anyhow::Result<PortProject> {
    let project = match format {
        Format::PopRaKo => {
            // Decode using JSON format.
            serde_json::from_reader(read)?
        }
        Format::LabelPlus => {
            // Decode using LabelPlus format.
            decode_labelplus(read)?
        }
    };

    Ok(project)
}

fn decode_labelplus(read: &mut impl io::Read) -> anyhow::Result<PortProject> {
    use std::io::BufRead;

    let reader = io::BufReader::new(read);
    let mut lines = reader.lines();

    // Skip header (version, groups, user note)
    let mut header_done = false;
    let mut dash_count = 0;

    while let Some(line) = lines.next() {
        let line = line?;
        let trimmed = line.trim();

        if trimmed == "-" {
            dash_count += 1;
            if dash_count == 2 {
                // After reading the user note group name the header ends
                if let Some(_) = lines.next() {
                    header_done = true;
                    break;
                }
            }
        }
    }

    if !header_done {
        anyhow::bail!("Invalid LabelPlus format: Header not found");
    }

    // Parse body: pages and units
    let mut pages = Vec::new();
    let mut current_page: Option<crate::model::project::PortPage> = None;
    let mut current_unit_text = String::new();
    let mut current_unit_meta: Option<(f64, f64, u32, u32)> = None; // (x, y, g, n)

    let page_header_regex = regex::Regex::new(r"^>{6,}\[(.+)\]<{6,}$").unwrap();
    let unit_header_regex =
        regex::Regex::new(r"^-{6,}\[(\d+)\]-{6,}\[([^,]+),([^,]+),(\d+)\]$").unwrap();

    for line in lines {
        let line = line?;
        let trimmed = line.trim();

        // Check for page header
        if let Some(caps) = page_header_regex.captures(trimmed) {
            // Flush previous unit (if any)
            if let Some((x, y, g, _n)) = current_unit_meta {
                if let Some(ref mut page) = current_page {
                    let text = current_unit_text.trim().to_string();
                    let translated_text = if text.is_empty() { None } else { Some(text) };

                    page.units.push(crate::model::project::PortUnit {
                        x,
                        y,
                        index_in_page: page.units.len() as u32 + 1,
                        is_inbox: g == 1,
                        translated_text,
                        is_prooved: false,
                        prooved_text: None,
                        comment: None,
                    });
                }
                current_unit_text.clear();
                current_unit_meta = None;
            }

            // Flush previous page (if any)
            if let Some(page) = current_page.take() {
                pages.push(page);
            }

            // Start new page
            let image_filename = caps.get(1).unwrap().as_str().to_string();
            current_page = Some(crate::model::project::PortPage {
                image_filename,
                units: Vec::new(),
            });

            continue;
        }

        // Check for unit header
        if let Some(caps) = unit_header_regex.captures(trimmed) {
            // Flush previous unit (if any)
            if let Some((x, y, g, _n)) = current_unit_meta {
                if let Some(ref mut page) = current_page {
                    let text = current_unit_text.trim().to_string();
                    let translated_text = if text.is_empty() { None } else { Some(text) };

                    page.units.push(crate::model::project::PortUnit {
                        x,
                        y,
                        index_in_page: page.units.len() as u32 + 1,
                        is_inbox: g == 1,
                        translated_text,
                        is_prooved: false,
                        prooved_text: None,
                        comment: None,
                    });
                }
                current_unit_text.clear();
            }

            // Parse metadata for the new unit
            let _n: u32 = caps.get(1).unwrap().as_str().parse()?;
            let x: f64 = caps.get(2).unwrap().as_str().parse()?;
            let y: f64 = caps.get(3).unwrap().as_str().parse()?;
            let g: u32 = caps.get(4).unwrap().as_str().parse()?;

            current_unit_meta = Some((x, y, g, _n));

            continue;
        }

        // Accumulate text content lines
        if current_unit_meta.is_some() {
            if !current_unit_text.is_empty() {
                current_unit_text.push('\n');
            }
            current_unit_text.push_str(&line);
        }
    }

    // Flush the last unit
    if let Some((x, y, g, _n)) = current_unit_meta {
        if let Some(ref mut page) = current_page {
            let text = current_unit_text.trim().to_string();
            let translated_text = if text.is_empty() { None } else { Some(text) };

            page.units.push(crate::model::project::PortUnit {
                x,
                y,
                index_in_page: page.units.len() as u32 + 1,
                is_inbox: g == 1,
                translated_text,
                is_prooved: false,
                prooved_text: None,
                comment: None,
            });
        }
    }

    // Flush the last page
    if let Some(page) = current_page {
        pages.push(page);
    }

    // Infer author and title from filename (format: 【author】title.labelplus.txt)
    let (author, title) = ("Unknown".to_string(), "Untitled".to_string());

    Ok(PortProject {
        author,
        title,
        pages,
    })
}
