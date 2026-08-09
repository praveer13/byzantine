use raft_log as lab;
macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}
lab_test!(replicate_basic, lab::check_replicate_basic());
lab_test!(majority_required, lab::check_majority_required());
lab_test!(heal_and_catchup, lab::check_heal_and_catchup());
lab_test!(no_committed_loss, lab::check_no_committed_loss());
lab_test!(storm, lab::check_storm());
