# GitHub Copilot Instructions

## Core Principles

- **No hallucination** - Only provide factually verified information
- **Verify before answering** - Use tools to check actual file contents, directory structures, and configurations
- **Don't make assumptions** - If uncertain, check the actual state rather than guessing

## Documentation Guidelines

- **Do not create new markdown files** unless explicitly requested by the user
- When explaining concepts or flows, use **visual diagrams and code examples** in responses rather than creating documentation files
- Prefer inline explanations with ASCII diagrams, code snippets, and visual representations
- Only create documentation files when the user specifically asks for it
- Provide compact commit message when user ask for it

## Task Management

- **After every feature completion**, always:
  1. Update `TASKS.md` with completed tasks and new status
  2. Update related markdown documentation files in `docs/` if feature impacts them
  3. Commit the changes with descriptive message
- Mark completed tasks, add new ones if discovered, and keep the task list current
- This ensures the project's task tracking and documentation stay synchronized with actual progress
- **Before committing or completing work** (if user wants to commit), verify all related documentation is updated
- **IMPORTANT**: Never modify or remove items from the "Personal note (Do not touch)" section in TASKS.md - this is the user's private task list

## POS Release Process

- **When creating a new POS release**, always:
  1. Update `pos/VERSION.txt` with the new version number
  2. Update `pos/apps/electron/package.json` version field
  3. Update `pos/RELEASE_NOTES_TEMPLATE.md` with:
     - New features added
     - Bug fixes included
     - Any breaking changes or important notes
  4. Commit all version and release note changes
  5. Create and push the git tag: `git tag pos-vX.X.X && git push origin main && git push origin pos-vX.X.X`
- This ensures consistent versioning and proper release documentation

## Communication Style

- Use visual aids (diagrams, flowcharts, ASCII art) whenever possible to enhance understanding
- Show data flows and architecture using text-based diagrams
- Include code examples with inline comments for explanations
- Keep explanations concise and visual-first

## Command Execution Guidelines

- **Always explain commands** before or when running them on servers
- For each terminal command, provide a brief one-line explanation of:
  - What the command does
  - What it's checking or modifying
  - Expected outcome
- Example format: "Check Docker container status to verify K-Golf is running"

## Git Operations

- **ALWAYS use standard git commands via run_in_terminal** (e.g., `git status`, `git add`, `git commit`, `git push`)
- **DO NOT use MCP git tools** (mcp_gitkraken_*) unless explicitly requested by the user
- Standard git workflow:
  1. `git status` - Check changed files
  2. `git add .` or `git add <specific files>` - Stage changes
  3. `git commit -m "descriptive message"` - Commit with clear message
  4. `git push` or `git push origin <branch>` - Push to remote
- Use conventional commit messages: `feat:`, `fix:`, `docs:`, `chore:`, etc.

## Production Environment

### Server Access
- **IP:** 147.182.215.135
- **SSH:** `ssh root@147.182.215.135`
- **Domain:** konegolf.ca (POS: pos.konegolf.ca)

### SSH Agent Setup
If SSH connection fails with permission denied, start the SSH agent:
```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key
ssh-add ~/.ssh/id_rsa
# or for ed25519 keys
ssh-add ~/.ssh/id_ed25519
```

### Production Database
- **Container:** `kgolf-postgres`
- **Database:** `kgolf_app`
- **User:** `kgolf`
- **Timezone:** America/Halifax (Atlantic Time)

### Quick Commands
```bash
# Access prod psql
ssh root@147.182.215.135 "docker exec -it kgolf-postgres psql -U kgolf -d kgolf_app"

# Run single query from local
ssh root@147.182.215.135 "docker exec kgolf-postgres psql -U kgolf -d kgolf_app -c '<QUERY>'"
```

### Docker Containers on Prod
- `k-golf-backend-1` - Backend API
- `kgolf-postgres` - PostgreSQL database

## Deprecated

- **Electron POS is deprecated** - Use web POS at pos.konegolf.ca instead
- Do not reference or suggest Electron POS features
