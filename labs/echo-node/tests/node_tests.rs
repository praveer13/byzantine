//! The browser and these tests run the same five checks (see src/lib.rs).

use echo_node as lab;

macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}

lab_test!(echo_basic, lab::check_echo_basic());
lab_test!(dup_effect_once, lab::check_dup_effect_once());
lab_test!(monotonic_seq, lab::check_monotonic_seq());
lab_test!(multi_sender, lab::check_multi_sender());
lab_test!(storm, lab::check_storm());
