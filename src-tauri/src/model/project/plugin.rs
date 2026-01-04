use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::model::project::PortProject;

pub trait PostProcess {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()>;
}

#[derive(Debug, Deserialize, Serialize)]
pub enum PostProcessor {
    CharConverter(NamedPostProcessor<CharConverter>),
}

impl PostProcessor {
    pub fn name(&self) -> &str {
        match self {
            PostProcessor::CharConverter(named) => &named.name,
        }
    }
}

impl PostProcess for PostProcessor {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()> {
        match self {
            PostProcessor::CharConverter(named) => named.processor.process(project),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(bound = "P: serde::Serialize + for<'a> serde::Deserialize<'a>")]
pub struct NamedPostProcessor<P>
where
    P: PostProcess + serde::Serialize + for<'a> serde::Deserialize<'a>,
{
    pub name: String,
    pub processor: P,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CharConverter {
    pub mapping: HashMap<char, String>,
}

impl PostProcess for CharConverter {
    fn process(&self, project: &mut PortProject) -> anyhow::Result<()> {
        let converter = |text: &mut String| {
            // Collect byte indices of characters that need replacement.
            let positions: Vec<(usize, char)> = text
                .char_indices()
                .filter(|&(_, ch)| self.mapping.contains_key(&ch))
                .collect();

            if positions.is_empty() {
                return;
            }

            // Build the new string by copying slices between matched chars
            // and inserting replacements for matched characters.
            let mut new_text = String::with_capacity(text.len() + positions.len() * 2);

            let mut prev_byte = 0usize;

            for (byte_idx, ch) in positions {
                if byte_idx > prev_byte {
                    new_text.push_str(&text[prev_byte..byte_idx]);
                }

                if let Some(repl) = self.mapping.get(&ch) {
                    new_text.push_str(repl);
                }

                prev_byte = byte_idx + ch.len_utf8();
            }

            if prev_byte < text.len() {
                new_text.push_str(&text[prev_byte..]);
            }

            *text = new_text;
        };

        for page in &mut project.pages {
            for unit in &mut page.units {
                if let Some(ref mut txt) = unit.prooved_text {
                    converter(txt);
                }

                if let Some(ref mut txt) = unit.translated_text {
                    converter(txt);
                }

                // Comment has no need to be converted.
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::collections::HashMap;

    use crate::model::project::{PortPage, PortProject, PortUnit};

    #[test]
    fn char_converter_replaces_chars() -> anyhow::Result<()> {
        let mut mapping: HashMap<char, String> = HashMap::new();

        mapping.insert('a', "α".to_string());
        mapping.insert('你', "nei".to_string());

        let converter = CharConverter { mapping };

        let unit = PortUnit {
            x: 0.0,
            y: 0.0,
            index_in_page: 0,
            is_inbox: false,
            translated_text: Some("bananas 你".to_string()),
            is_prooved: false,
            prooved_text: Some("a1".to_string()),
            comment: Some("nochange".to_string()),
        };

        let page = PortPage {
            image_filename: "img.png".to_string(),
            units: vec![unit],
        };

        let mut project = PortProject {
            author: "a你".to_string(),
            title: "title".to_string(),
            pages: vec![page],
        };

        converter.process(&mut project)?;

        let u = &project.pages[0].units[0];

        assert_eq!(u.translated_text.as_deref(), Some("bαnαnαs nei"));
        assert_eq!(u.prooved_text.as_deref(), Some("α1"));
        assert_eq!(u.comment.as_deref(), Some("nochange"));

        Ok(())
    }
}
