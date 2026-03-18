#!/usr/bin/env python3
"""
Reads REQUESTS.md, calls Claude API to understand the change requested,
then applies edits to the site files using tool use.
"""

import json
import os
import sys
from pathlib import Path

import anthropic

REPO_ROOT = Path(__file__).parent.parent.parent
REQUESTS_FILE = REPO_ROOT / "REQUESTS.md"

# Files Claude is allowed to read and edit
EDITABLE_EXTENSIONS = {".html", ".css", ".js", ".md"}
EXCLUDED_FILES = {"REQUESTS.md"}


def read_requests_file() -> str:
    content = REQUESTS_FILE.read_text()
    # Extract the actual request — everything after "## Your request"
    marker = "## Your request"
    if marker in content:
        request_section = content.split(marker, 1)[1].strip()
        # Strip blockquote markers and placeholder text
        lines = [
            line.lstrip("> ").strip()
            for line in request_section.splitlines()
            if line.strip() and not line.strip().startswith("(Replace this line")
        ]
        return "\n".join(lines).strip()
    return content.strip()


def list_site_files() -> list[str]:
    files = []
    for path in sorted(REPO_ROOT.rglob("*")):
        if path.is_file() and path.suffix in EDITABLE_EXTENSIONS:
            rel = str(path.relative_to(REPO_ROOT))
            if not any(part.startswith(".") for part in path.parts[len(REPO_ROOT.parts):]):
                if path.name not in EXCLUDED_FILES:
                    files.append(rel)
    return files


def read_file(path: str) -> str:
    full = REPO_ROOT / path
    if not full.resolve().is_relative_to(REPO_ROOT.resolve()):
        return "Error: path outside repository"
    if not full.exists():
        return f"Error: file not found: {path}"
    return full.read_text(encoding="utf-8")


def write_file(path: str, content: str) -> str:
    full = REPO_ROOT / path
    if not full.resolve().is_relative_to(REPO_ROOT.resolve()):
        return "Error: path outside repository"
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(content, encoding="utf-8")
    return f"Written: {path}"


TOOLS = [
    {
        "name": "list_files",
        "description": "List all editable site files in the repository.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "read_file",
        "description": "Read the contents of a site file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative path from repo root, e.g. index.html"}
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write (overwrite) a site file with new content. Use this to apply changes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Relative path from repo root"},
                "content": {"type": "string", "description": "Full new content for the file"},
            },
            "required": ["path", "content"],
        },
    },
]

SYSTEM = """You are a helpful assistant that makes updates to a photography portfolio website.

The site is a static HTML/CSS/JS website. When asked to make a change:
1. Use list_files to see what files exist
2. Use read_file to read the relevant files
3. Use write_file to apply the changes — always write the COMPLETE file content, not just the changed parts
4. Make only the changes requested — do not refactor or rewrite unrelated code
5. After all changes are applied, briefly summarise what you changed

Be careful to preserve all existing functionality when editing files."""


def run_tool(name: str, input_data: dict) -> str:
    if name == "list_files":
        files = list_site_files()
        return "\n".join(files) if files else "No editable files found."
    if name == "read_file":
        return read_file(input_data["path"])
    if name == "write_file":
        return write_file(input_data["path"], input_data["content"])
    return f"Unknown tool: {name}"


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    request = read_requests_file()
    if not request:
        print("No request found in REQUESTS.md — nothing to do.")
        sys.exit(0)

    print(f"Request: {request}\n")

    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": "user", "content": request}]

    while True:
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=8096,
            system=SYSTEM,
            tools=TOOLS,
            messages=messages,
        )

        # Collect tool calls and text
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]

        for block in text_blocks:
            print(block.text)

        if response.stop_reason == "end_turn" or not tool_uses:
            break

        # Execute all tool calls
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for tool in tool_uses:
            print(f"[tool] {tool.name}({json.dumps(tool.input, ensure_ascii=False)[:120]})")
            result = run_tool(tool.name, tool.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool.id,
                "content": result,
            })

        messages.append({"role": "user", "content": tool_results})

    print("\nDone.")


if __name__ == "__main__":
    main()
