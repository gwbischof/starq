"""starq CLI — manage queues and jobs on a Starq server."""

from __future__ import annotations

import argparse
import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def _request(url: str, method: str = "GET", data: dict | None = None, api_key: str | None = None) -> dict | list:
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if api_key:
        req.add_header("X-API-Key", api_key)
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"Error: {e.code} {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def cmd_health(args):
    r = _request(f"{args.url}/api/health")
    print(json.dumps(r, indent=2))


def cmd_create(args):
    data = {"name": args.name}
    if args.description:
        data["description"] = args.description
    if args.dedupe:
        data["dedupe"] = True
    r = _request(f"{args.url}/api/v1/queues", method="POST", data=data, api_key=args.api_key)
    print(json.dumps(r, indent=2))


def cmd_list(args):
    r = _request(f"{args.url}/api/v1/queues")
    queues = r.get("queues", [])
    if not queues:
        print("No queues")
        return
    for q in queues:
        print(f"  {q['name']:20s}  pending={q.get('pending',0)}  completed={q.get('completed',0)}  failed={q.get('failed',0)}")


def cmd_info(args):
    r = _request(f"{args.url}/api/v1/queues/{args.name}")
    print(json.dumps(r, indent=2))


def cmd_delete(args):
    r = _request(f"{args.url}/api/v1/queues/{args.name}", method="DELETE", api_key=args.api_key)
    print(json.dumps(r, indent=2))


def cmd_submit(args):
    if args.file == "-":
        lines = sys.stdin.read().splitlines()
    else:
        with open(args.file) as f:
            lines = f.read().splitlines()

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

    endpoint = f"{args.url}/api/v1/queues/{args.queue}/jobs"
    total_submitted = 0
    total_skipped = 0

    for start in range(0, len(payloads), args.batch_size):
        batch = payloads[start : start + args.batch_size]
        body = {"jobs": [{"payload": p} for p in batch]}
        result = _request(endpoint, method="POST", data=body, api_key=args.api_key)
        total_submitted += result.get("submitted", len(result.get("jobs", [])))
        total_skipped += result.get("skipped", 0)
        print(f"  processed {total_submitted + total_skipped}/{len(payloads)}")

    msg = f"Done — {total_submitted} jobs submitted to '{args.queue}'"
    if total_skipped:
        msg += f" ({total_skipped} skipped as duplicates)"
    print(msg)


def cmd_jobs(args):
    url = f"{args.url}/api/v1/queues/{args.queue}/jobs"
    params = []
    if args.status:
        params.append(f"status={args.status}")
    if args.limit:
        params.append(f"limit={args.limit}")
    if params:
        url += "?" + "&".join(params)
    r = _request(url)
    jobs = r.get("jobs", [])
    if not jobs:
        print("No jobs")
        return
    for j in jobs:
        status = j.get("status", "?")
        payload = json.dumps(j.get("payload", {}))
        if len(payload) > 60:
            payload = payload[:57] + "..."
        print(f"  {j['id']:20s}  {status:10s}  {payload}")
    if r.get("has_more"):
        print(f"  ... more available (cursor: {r.get('cursor', '')})")


def cmd_claim(args):
    data = {"count": args.count}
    r = _request(f"{args.url}/api/v1/queues/{args.queue}/jobs/claim", method="POST", data=data, api_key=args.api_key)
    jobs = r.get("jobs", [])
    if not jobs:
        print("No jobs to claim")
        return
    for j in jobs:
        print(f"  claimed {j['id']}  payload={json.dumps(j.get('payload', {}))}")


def cmd_complete(args):
    data = {}
    if args.result:
        data["result"] = json.loads(args.result)
    r = _request(f"{args.url}/api/v1/queues/{args.queue}/jobs/{args.job_id}/complete", method="PUT", data=data, api_key=args.api_key)
    print(json.dumps(r, indent=2))


def cmd_fail(args):
    data = {"error": args.error or ""}
    r = _request(f"{args.url}/api/v1/queues/{args.queue}/jobs/{args.job_id}/fail", method="PUT", data=data, api_key=args.api_key)
    print(json.dumps(r, indent=2))


def main():
    parser = argparse.ArgumentParser(prog="starq", description="Starq CLI — manage queues and jobs")
    parser.add_argument("-u", "--url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("-k", "--api-key", default=None, help="API key for write operations")

    sub = parser.add_subparsers(dest="command")

    # health
    sub.add_parser("health", help="Check API health")

    # queues
    sub.add_parser("queues", help="List all queues")

    p = sub.add_parser("create", help="Create a queue")
    p.add_argument("name", help="Queue name")
    p.add_argument("-d", "--description", default="", help="Queue description")
    p.add_argument("--dedupe", action="store_true", help="Reject jobs with duplicate payloads")

    p = sub.add_parser("info", help="Queue details + stats")
    p.add_argument("name", help="Queue name")

    p = sub.add_parser("delete", help="Delete a queue")
    p.add_argument("name", help="Queue name")

    # jobs
    p = sub.add_parser("submit", help="Submit JSONL file as jobs")
    p.add_argument("file", help="Path to JSONL file (- for stdin)")
    p.add_argument("-q", "--queue", required=True, help="Queue name")
    p.add_argument("-b", "--batch-size", type=int, default=100, help="Jobs per request")

    p = sub.add_parser("jobs", help="List jobs in a queue")
    p.add_argument("queue", help="Queue name")
    p.add_argument("-s", "--status", default=None, help="Filter by status")
    p.add_argument("-l", "--limit", type=int, default=None, help="Max jobs to return")

    p = sub.add_parser("claim", help="Claim jobs from a queue")
    p.add_argument("queue", help="Queue name")
    p.add_argument("-n", "--count", type=int, default=1, help="Number of jobs to claim")

    p = sub.add_parser("complete", help="Mark a job as completed")
    p.add_argument("queue", help="Queue name")
    p.add_argument("job_id", help="Job ID")
    p.add_argument("-r", "--result", default=None, help="Result JSON")

    p = sub.add_parser("fail", help="Mark a job as failed")
    p.add_argument("queue", help="Queue name")
    p.add_argument("job_id", help="Job ID")
    p.add_argument("-e", "--error", default="", help="Error message")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "health": cmd_health,
        "queues": cmd_list,
        "create": cmd_create,
        "info": cmd_info,
        "delete": cmd_delete,
        "submit": cmd_submit,
        "jobs": cmd_jobs,
        "claim": cmd_claim,
        "complete": cmd_complete,
        "fail": cmd_fail,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
