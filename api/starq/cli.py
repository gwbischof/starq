"""starq CLI — submit JSONL files as jobs to a queue."""

from __future__ import annotations

import argparse
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def main():
    parser = argparse.ArgumentParser(description="Submit JSONL jobs to a Starq queue")
    parser.add_argument("file", help="Path to JSONL file (- for stdin)")
    parser.add_argument("-q", "--queue", required=True, help="Queue name")
    parser.add_argument("-k", "--api-key", required=True, help="API key")
    parser.add_argument(
        "-u", "--url", default="http://localhost:8000", help="API base URL (default: http://localhost:8000)"
    )
    parser.add_argument("-b", "--batch-size", type=int, default=100, help="Jobs per request (default: 100)")
    args = parser.parse_args()

    # Read lines
    if args.file == "-":
        lines = sys.stdin.read().splitlines()
    else:
        with open(args.file) as f:
            lines = f.read().splitlines()

    # Parse payloads
    payloads = []
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
        try:
            payloads.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"Bad JSON on line {i}: {e}", file=sys.stderr)
            sys.exit(1)

    if not payloads:
        print("No jobs to submit", file=sys.stderr)
        sys.exit(0)

    endpoint = f"{args.url.rstrip('/')}/api/v1/queues/{args.queue}/jobs"
    total = 0

    # Submit in batches
    for start in range(0, len(payloads), args.batch_size):
        batch = payloads[start : start + args.batch_size]
        body = json.dumps({"jobs": [{"payload": p} for p in batch]}).encode()

        req = Request(endpoint, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("X-API-Key", args.api_key)

        try:
            with urlopen(req) as resp:
                result = json.loads(resp.read())
                total += len(result)
                print(f"  submitted {total}/{len(payloads)}")
        except HTTPError as e:
            print(f"Error: {e.code} {e.read().decode()}", file=sys.stderr)
            sys.exit(1)

    print(f"Done — {total} jobs submitted to '{args.queue}'")


if __name__ == "__main__":
    main()
