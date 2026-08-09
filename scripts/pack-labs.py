#!/usr/bin/env python3
"""pack-labs — zip forge lab templates into public/labs/ for download.

The zip is the student-facing workspace: kit + lab crate(s) + devcontainer +
README. Reference solutions (_solutions/) and build artifacts (target/) are
never shipped. Re-run after any change under labs/:

    python3 scripts/pack-labs.py
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABS = os.path.join(ROOT, "labs")
OUT_DIR = os.path.join(ROOT, "public", "labs")

# (zip name, lab crate, extra members to include)
SHARED = [
    "README.md",
    ".gitignore",
    "AGENTS.md",
    "CLAUDE.md",
    ".devcontainer/devcontainer.json",
    "kit/Cargo.toml",
    "kit/src/lib.rs",
]


def crate_files(lab: str, edit_file: str, tests_file: str) -> list[str]:
    return [
        f"{lab}/Cargo.toml",
        f"{lab}/src/lib.rs",
        f"{lab}/src/{edit_file}",
        f"{lab}/tests/{tests_file}",
    ]


PACKAGES = [
    ("echo-node.zip", "echo-node", SHARED + crate_files("echo-node", "node.rs", "node_tests.rs")),
    ("kv-store.zip", "kv-store", SHARED + crate_files("kv-store", "store.rs", "store_tests.rs")),
    ("election.zip", "election", SHARED + crate_files("election", "raft.rs", "election_tests.rs")),
    ("raft-log.zip", "raft-log", SHARED + crate_files("raft-log", "raft.rs", "raft_tests.rs")),
    ("snapshots.zip", "snapshots", SHARED + crate_files("snapshots", "raft.rs", "snap_tests.rs")),
    ("linearizable-kv.zip", "linearizable-kv", SHARED + crate_files("linearizable-kv", "raft.rs", "kv_tests.rs")),
]


def workspace_toml(lab: str) -> str:
    """Each zip gets a workspace manifest naming only the crates it ships —
    the repo's manifest lists all labs and would break a standalone unzip."""
    return f'[workspace]\nmembers = ["kit", "{lab}"]\nresolver = "2"\n'


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    for zip_name, lab, members in PACKAGES:
        out = os.path.join(OUT_DIR, zip_name)
        missing = [m for m in members if not os.path.isfile(os.path.join(LABS, m))]
        if missing:
            print(f"error: missing files for {zip_name}: {missing}", file=sys.stderr)
            return 1
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("Cargo.toml", workspace_toml(lab))
            for m in members:
                z.write(os.path.join(LABS, m), arcname=m)
        size = os.path.getsize(out)
        print(f"packed {zip_name}: {len(members) + 1} files, {size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
