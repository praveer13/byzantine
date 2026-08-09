use linearizable_kv as lab;
macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}
lab_test!(put_get_basic, lab::check_put_get_basic());
lab_test!(cas_correctness, lab::check_cas_correctness());
lab_test!(stale_leader_fence, lab::check_stale_leader_fence());
lab_test!(linearizable_storm, lab::check_linearizable_storm());
