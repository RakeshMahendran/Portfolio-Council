"""
git_ops — thin wrappers around the git CLI, used by main.py.

Each function operates on a given repo path. All subprocess calls use
capture_output=True + text=True so we can parse stdout cleanly.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

# Whitelist for branch names — prevents shell-meta injection
BRANCH_NAME_RE = re.compile(r"^[a-zA-Z0-9_/.\-]+$")


def _run(cmd: list[str], repo: Path) -> str:
    """Run a git command in `repo`, return stdout. Raise on non-zero exit."""
    result = subprocess.run(
        cmd,
        cwd=str(repo),
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def git_log(repo: Path, max_count: int = 50) -> list[dict]:
    """
    Return a list of recent commits in the repo.

    Each dict has: hash, shortHash, subject, author, date, body,
    isGitclawAuthored, isRebalance.
    """
    fmt = "%H|||%h|||%s|||%an|||%aI|||%b---END---"
    raw = _run(
        ["git", "log", f"--max-count={max_count}", f"--pretty=format:{fmt}"],
        repo,
    )

    commits: list[dict] = []
    for entry in raw.split("---END---"):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("|||")
        if len(parts) < 6:
            continue
        h, sh, subj, author, date, body = parts
        body_clean = body.strip()
        commits.append(
            {
                "hash": h,
                "shortHash": sh,
                "subject": subj,
                "author": author,
                "date": date,
                "body": body_clean,
                "isGitclawAuthored": "GitClaw" in body_clean
                or "gitclaw" in subj.lower(),
                "isRebalance": "rebalance" in subj.lower(),
            }
        )
    return commits


def git_show(repo: Path, commit_hash: str) -> dict:
    """
    Return full body + files-changed for a single commit.
    """
    fmt = "%H|||%s|||%an|||%aI|||%b---BODYEND---"
    raw = _run(
        ["git", "show", f"--pretty=format:{fmt}", "--name-status", commit_hash],
        repo,
    )

    # Split off the body section from the files section
    head, _, tail = raw.partition("---BODYEND---")
    parts = head.split("|||")
    if len(parts) < 5:
        raise ValueError(f"Could not parse git show output for {commit_hash}")
    h, subj, author, date, body = parts

    files: list[dict] = []
    for line in tail.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        # Lines look like: "M\tpath/to/file"  or "A\tnewfile"
        bits = line.split("\t")
        if len(bits) >= 2:
            files.append({"status": bits[0], "path": bits[1]})

    return {
        "hash": h,
        "subject": subj,
        "author": author,
        "date": date,
        "body": body.strip(),
        "files": files,
    }


def git_branch_list(repo: Path) -> list[str]:
    """Return all local branch names."""
    raw = _run(["git", "branch", "--format=%(refname:short)"], repo)
    return [b.strip() for b in raw.split("\n") if b.strip()]


def git_branch_current(repo: Path) -> str:
    """Return current branch name (HEAD)."""
    raw = _run(["git", "branch", "--show-current"], repo)
    return raw.strip()


def git_branch_create(repo: Path, name: str) -> str:
    """
    Create a new branch from HEAD via `git checkout -b <name>`.
    Refuses names with characters that aren't [a-zA-Z0-9_/.-].
    """
    if not BRANCH_NAME_RE.fullmatch(name):
        raise ValueError(
            f"Invalid branch name {name!r} — must match {BRANCH_NAME_RE.pattern}"
        )
    _run(["git", "checkout", "-b", name], repo)
    return name


def git_checkout(repo: Path, branch: str) -> None:
    """Switch to an existing branch."""
    if not BRANCH_NAME_RE.fullmatch(branch):
        raise ValueError(f"Invalid branch name {branch!r}")
    _run(["git", "checkout", branch], repo)


def git_revert(repo: Path, commit_hash: str, reason: str | None) -> str:
    """
    Revert `commit_hash` and return the new commit's hash.
    If `reason` is provided, amend the revert commit message to include it.
    """
    if not re.fullmatch(r"[a-fA-F0-9]{7,40}", commit_hash):
        raise ValueError(f"Invalid commit hash {commit_hash!r}")

    _run(["git", "revert", "--no-edit", commit_hash], repo)

    if reason:
        # Amend the revert commit to include the user's reason
        current_msg = _run(["git", "log", "-1", "--pretty=format:%B"], repo).rstrip()
        new_msg = f"{current_msg}\n\nReason for revert: {reason}\n"
        _run(["git", "commit", "--amend", "-m", new_msg], repo)

    new_hash = _run(["git", "rev-parse", "HEAD"], repo).strip()
    return new_hash
