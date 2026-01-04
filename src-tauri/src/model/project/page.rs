
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct LocalPage {
	pub id: String,
	pub local_image_path: String,
}
