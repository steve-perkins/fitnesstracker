#!/usr/bin/env python3
"""
Build and push FitnessTracker Docker images to the private registry.

Usage:
    python3 scripts/deploy.py
    python3 scripts/deploy.py --registry registry.example.com
    python3 scripts/deploy.py --registry registry.example.com \
        --api-base-url https://api.example.com \
        --google-client-id YOUR_CLIENT_ID

Each value is resolved in order: CLI flag → environment variable (or .env
file in the working directory) → interactive prompt.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("Required package not installed.")
    print("Run: pip3 install -r scripts/requirements.txt")
    sys.exit(1)

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent


def get_value(arg_value, env_var, prompt):
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

    value = input(prompt).strip()
    if not value:
        print(f"Error: {env_var} cannot be blank.")
        sys.exit(1)
    return value


def run(cmd):
    subprocess.run(cmd, check=True)


def main():
    parser = argparse.ArgumentParser(description="Build and push FitnessTracker Docker images")
    parser.add_argument("--registry", help="Docker registry host (env: DOCKER_REGISTRY)")
    parser.add_argument("--api-base-url", help="Frontend API base URL (env: VITE_API_BASE_URL)")
    parser.add_argument("--google-client-id", help="Google OAuth client ID (env: VITE_GOOGLE_CLIENT_ID)")
    args = parser.parse_args()

    registry = get_value(args.registry, "DOCKER_REGISTRY", "Docker registry host: ")
    api_base_url = get_value(args.api_base_url, "VITE_API_BASE_URL", "Frontend API base URL: ")
    google_client_id = get_value(args.google_client_id, "VITE_GOOGLE_CLIENT_ID", "Google OAuth client ID: ")

    api_image = f"{registry}/fitnesstracker-api:latest"
    web_image = f"{registry}/fitnesstracker-web:latest"

    print("Authenticating with remote Docker registry")
    run(["docker", "login", registry])

    print("Building and pushing the backend API Docker image")
    run(["docker", "build", "-t", api_image, str(REPO_ROOT / "backend")])
    run(["docker", "push", api_image])

    print("Building and pushing the web frontend Docker image")
    run([
        "docker", "build",
        "--build-arg", f"VITE_API_BASE_URL={api_base_url}",
        "--build-arg", f"VITE_GOOGLE_CLIENT_ID={google_client_id}",
        "-t", web_image,
        str(REPO_ROOT / "web"),
    ])
    run(["docker", "push", web_image])

    print()
    print()
    print("Done. On the remote server, you need to execute...")
    print()
    print("cd docker")
    print("docker compose pull fitnesstracker-api fitnesstracker-web")
    print("docker compose up -d fitnesstracker-api fitnesstracker-web")


if __name__ == "__main__":
    main()
