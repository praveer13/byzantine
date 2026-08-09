use snapshots as lab;
macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}
lab_test!(compact_bounds, lab::check_compact_bounds());
lab_test!(snapshot_catchup, lab::check_snapshot_catchup());
lab_test!(state_after_compact, lab::check_state_after_compact());
lab_test!(storm_compact, lab::check_storm_compact());
