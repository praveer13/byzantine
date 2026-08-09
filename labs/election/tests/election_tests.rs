//! The browser and these tests run the same five checks (see src/lib.rs).

use election as lab;

macro_rules! lab_test {
    ($name:ident, $check:expr) => {
        #[test]
        fn $name() {
            let c = $check;
            assert!(c.pass, "[{}] {} — {}", c.id, c.label, c.msg);
        }
    };
}

lab_test!(clean_election, lab::check_clean_election());
lab_test!(one_per_term, lab::check_one_per_term());
lab_test!(minority_refuses, lab::check_minority_refuses());
lab_test!(term_fencing, lab::check_term_fencing());
lab_test!(split_votes, lab::check_split_votes());
