//! The browser and these tests run the same five checks (see src/lib.rs).

use kv_store as lab;

macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}

lab_test!(basics, lab::check_basics());
lab_test!(cas_semantics, lab::check_cas_semantics());
lab_test!(versions, lab::check_versions());
lab_test!(retry_safety, lab::check_retry_safety());
lab_test!(storm, lab::check_storm());
