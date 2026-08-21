from __future__ import annotations

from typing import Final


TAXONOMY_VERSION: Final = "2026-08-21.v1"

FAMILIES: Final = (
    {"key": "execution", "label": "Execution", "color": "#F59E42"},
    {"key": "coordination", "label": "Coordination", "color": "#59B8A8"},
    {"key": "files", "label": "Files", "color": "#73A9E8"},
    {"key": "research", "label": "Research", "color": "#E56B5D"},
    {"key": "workflow", "label": "Workflow", "color": "#CBD2CC"},
    {"key": "unmapped", "label": "Unmapped", "color": "#8F9891"},
)

# This is deliberately an exact-name mapping. Tool names are never classified by
# prefixes or substrings: a newly observed name must remain visible in Unmapped
# until this versioned table is intentionally updated.
TOOL_FAMILY: Final = {
    # Execution
    "exec_command": "execution",
    "exec": "execution",
    "write_stdin": "execution",
    "shell_command": "execution",
    "Bash": "execution",
    "shell": "execution",
    "js": "execution",
    "send_input": "execution",
    "js_reset": "execution",
    "js_add_node_module_dir": "execution",
    "read_thread_terminal": "execution",
    # Coordination
    "wait_agent": "coordination",
    "wait": "coordination",
    "send_message": "coordination",
    "spawn_agent": "coordination",
    "close_agent": "coordination",
    "list_agents": "coordination",
    "followup_task": "coordination",
    "interrupt_agent": "coordination",
    "resume_agent": "coordination",
    "Agent": "coordination",
    "create_thread": "coordination",
    "list_threads": "coordination",
    "read_thread": "coordination",
    "read_history": "coordination",
    "_list_messages": "coordination",
    # Files
    "apply_patch": "files",
    "Read": "files",
    "Edit": "files",
    "Write": "files",
    "view_image": "files",
    "get_file_contents": "files",
    "_fetch_file": "files",
    "_create_file": "files",
    # Research
    "WebSearch": "research",
    "WebFetch": "research",
    "ToolSearch": "research",
    "search_code": "research",
    "_search": "research",
    "_fetch": "research",
    "get_page_content": "research",
    "get_pull_request": "research",
    "get_pull_request_files": "research",
    "get_pull_request_diff": "research",
    "get_issue_comments": "research",
    "get_commit": "research",
    "list_commits": "research",
    "list_pull_request_review_comments": "research",
    "list_pull_requests": "research",
    "search_pull_requests": "research",
    "search_repositories": "research",
    "list_mcp_resources": "research",
    "list_mcp_resource_templates": "research",
    # Workflow
    "update_plan": "workflow",
    "create_goal": "workflow",
    "update_goal": "workflow",
    "get_goal": "workflow",
    "TaskCreate": "workflow",
    "TaskUpdate": "workflow",
    "AskUserQuestion": "workflow",
    "request_user_input": "workflow",
    "Skill": "workflow",
    "Artifact": "workflow",
    "Monitor": "workflow",
    "automation_update": "workflow",
}


def family_for_tool(tool_name: str) -> str:
    return TOOL_FAMILY.get(tool_name, "unmapped")

