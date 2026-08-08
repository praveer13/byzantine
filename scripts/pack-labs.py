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
PACKAGES = [
    (
        "echo-node.zip",
        "echo-node",
        [
            "README.md",
            ".gitignore",
            "AGENTS.md",
            "CLAUDE.md",
            ".devcontainer/devcontainer.json",
            "kit/Cargo.toml",
            "kit/src/lib.rs",
            "echo-node/Cargo.toml",
            "echo-node/src/lib.rs",
            "echo-node/src/node.rs",
            "echo-node/tests/node_tests.rs",
        ],
    ),
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
