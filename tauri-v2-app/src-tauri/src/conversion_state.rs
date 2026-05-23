use std::collections::HashMap;
use std::process::Child;
use std::sync::Mutex;

pub struct ConversionState {
    pub processes: Mutex<HashMap<String, Child>>,
}

impl ConversionState {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}
