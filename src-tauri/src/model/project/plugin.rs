use serde::{Deserialize, Serialize};

use crate::project::plugin::PostProcess;

#[derive(Debug, Deserialize, Serialize)]
pub enum PostProcessor {
    StrConverter(NamedPostProcessor<StrConverter>),
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
pub struct StrConverter {
    pub mapping: Vec<(String, String)>,
}

#[cfg(test)]
mod test {
    use super::*;

    use crate::model::project::{PortPage, PortProject, PortUnit};

    #[test]
    fn str_converter_replaces_strings() -> anyhow::Result<()> {
        let mapping = vec![
            ("a".to_string(), "α".to_string()),
            ("你".to_string(), "nei".to_string()),
        ];

        let converter = StrConverter { mapping };

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

    #[test]
    fn str_converter_handles_priority() -> anyhow::Result<()> {
        let mapping = vec![
            ("bcd".to_string(), "[BCD]".to_string()),
            ("ab".to_string(), "[AB]".to_string()),
        ];

        let converter = StrConverter { mapping };

        let unit = PortUnit {
            x: 0.0,
            y: 0.0,
            index_in_page: 0,
            is_inbox: false,
            translated_text: Some("abcd".to_string()),
            is_prooved: false,
            prooved_text: Some("ab_bcd".to_string()),
            comment: None,
        };

        let page = PortPage {
            image_filename: "img.png".to_string(),
            units: vec![unit],
        };

        let mut project = PortProject {
            author: "author".to_string(),
            title: "title".to_string(),
            pages: vec![page],
        };

        converter.process(&mut project)?;

        let u = &project.pages[0].units[0];

        assert_eq!(u.translated_text.as_deref(), Some("a[BCD]"));
        assert_eq!(u.prooved_text.as_deref(), Some("[AB]_[BCD]"));

        Ok(())
    }

    #[test]
    fn str_converter_handles_empty_cases() -> anyhow::Result<()> {
        let mapping = vec![("test".to_string(), "[TEST]".to_string())];

        let converter = StrConverter { mapping };

        let unit = PortUnit {
            x: 0.0,
            y: 0.0,
            index_in_page: 0,
            is_inbox: false,
            translated_text: Some("no match".to_string()),
            is_prooved: false,
            prooved_text: Some("".to_string()),
            comment: None,
        };

        let page = PortPage {
            image_filename: "img.png".to_string(),
            units: vec![unit],
        };

        let mut project = PortProject {
            author: "author".to_string(),
            title: "title".to_string(),
            pages: vec![page],
        };

        converter.process(&mut project)?;

        let u = &project.pages[0].units[0];

        assert_eq!(u.translated_text.as_deref(), Some("no match"));
        assert_eq!(u.prooved_text.as_deref(), Some(""));

        Ok(())
    }

    #[test]
    fn str_converter_handles_overlapping_patterns() -> anyhow::Result<()> {
        let mapping = vec![
            ("abc".to_string(), "[ABC]".to_string()),
            ("bc".to_string(), "[BC]".to_string()),
            ("c".to_string(), "[C]".to_string()),
        ];

        let converter = StrConverter { mapping };

        let unit = PortUnit {
            x: 0.0,
            y: 0.0,
            index_in_page: 0,
            is_inbox: false,
            translated_text: Some("abc c abc".to_string()),
            is_prooved: false,
            prooved_text: None,
            comment: None,
        };

        let page = PortPage {
            image_filename: "img.png".to_string(),
            units: vec![unit],
        };

        let mut project = PortProject {
            author: "author".to_string(),
            title: "title".to_string(),
            pages: vec![page],
        };

        converter.process(&mut project)?;

        let u = &project.pages[0].units[0];

        assert_eq!(u.translated_text.as_deref(), Some("[ABC] [C] [ABC]"));

        Ok(())
    }
}
