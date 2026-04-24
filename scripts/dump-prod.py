#!/usr/bin/env python3
"""
Export a plain-SQL dump from the production PostgreSQL instance.

The dump is written locally and is suitable for loading into the local
development database via scripts/load-data.sh.

Usage:
    python3 scripts/dump-prod.py
    python3 scripts/dump-prod.py --ssh-host prod.example.com --ssh-user steve --ssh-key ~/.ssh/id_rsa

Each value is resolved in order: CLI flag → environment variable (or .env
file in the working directory) → interactive prompt.  --ssh-key / PROD_SSH_KEY
is optional; if omitted, SSH uses its default key.
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("Required package not installed.")
    print("Run: pip3 install -r scripts/requirements.txt")
    sys.exit(1)

load_dotenv()

SCRIPTS_DIR = Path(__file__).resolve().parent


def get_value(arg_value, env_var, prompt, default=None):
    """Resolve a config value from CLI arg → env var → interactive prompt."""
    if arg_value is not None:
        value = arg_value.strip()
        if value:
            return value

    env_value = os.environ.get(env_var)
    if env_value is not None:
        value = env_value.strip()
        if value:
            return value

    if default is not None:
        prompted = input(f"{prompt} [{default}]: ").strip()
        return prompted if prompted else default

    value = input(prompt).strip()
    if not value:
        print(f"Error: {env_var} cannot be blank.")
        sys.exit(1)
    return value


def main():
    parser = argparse.ArgumentParser(
        description="Dump production PostgreSQL to a local SQL file"
    )
    parser.add_argument("--ssh-host", help="Production server hostname (env: PROD_SSH_HOST)")
    parser.add_argument("--ssh-user", help="SSH username (env: PROD_SSH_USER)")
    parser.add_argument("--db-container", help="Docker container name on the server (env: PROD_DB_CONTAINER)")
    parser.add_argument("--db-name", help="Production database name (env: PROD_DB_NAME)")
    parser.add_argument("--db-user", help="Production database username (env: PROD_DB_USER)")
    parser.add_argument("--ssh-key", help="Path to SSH private key (env: PROD_SSH_KEY, optional)")
    parser.add_argument("--output", help="Local output file path (default: scripts/production_dump_<timestamp>.sql)")
    args = parser.parse_args()

    ssh_host = get_value(args.ssh_host, "PROD_SSH_HOST", "Production server hostname: ")
    ssh_user = get_value(args.ssh_user, "PROD_SSH_USER", "SSH username: ", default="root")
    ssh_key = args.ssh_key or os.environ.get("PROD_SSH_KEY") or None
    db_container = get_value(args.db_container, "PROD_DB_CONTAINER", "Docker container name: ", default="db-postgres-fitnesstracker")
    db_name = get_value(args.db_name, "PROD_DB_NAME", "Database name: ", default="fitnesstracker")
    db_user = get_value(args.db_user, "PROD_DB_USER", "Database username: ", default="fitnesstracker")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    default_output = str(SCRIPTS_DIR / f"production_dump_{timestamp}.sql")
    output_path = args.output if args.output else default_output

    remote_cmd = (
        f"docker exec {db_container} "
        f"pg_dump -U {db_user} -d {db_name} --no-owner --no-privileges"
    )
    ssh_cmd = ["ssh"]
    if ssh_key:
        ssh_cmd += ["-i", ssh_key]
    ssh_cmd += [f"{ssh_user}@{ssh_host}", remote_cmd]

    print(f"Dumping {db_name} from {ssh_user}@{ssh_host}...")
    print(f"Output: {output_path}")

    with open(output_path, "w") as f:
        result = subprocess.run(ssh_cmd, stdout=f, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        print("Error during dump:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        Path(output_path).unlink(missing_ok=True)
        sys.exit(result.returncode)

    size_kb = Path(output_path).stat().st_size // 1024
    print(f"Done. {size_kb} KB written to {output_path}")
    print()
    print("Load into local dev database with:")
    print(f"  scripts/load-data.sh {output_path}")


if __name__ == "__main__":
    main()