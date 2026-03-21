## Jira Connection

Jira is configured. Use the CLI to manage issues, search by JQL, transition statuses, and add comments.

```bash
# Get issue details
node C:/DEV/Lizz/dist/connections/jira/cli.js get PROJECT-123

# Search issues (JQL)
node C:/DEV/Lizz/dist/connections/jira/cli.js search "assignee = currentUser() AND status = 'To Do'"
node C:/DEV/Lizz/dist/connections/jira/cli.js search "project = PROJ AND sprint in openSprints()"

# List available transitions
node C:/DEV/Lizz/dist/connections/jira/cli.js transitions PROJECT-123

# Move issue to a status
node C:/DEV/Lizz/dist/connections/jira/cli.js transition PROJECT-123 "In Progress"
node C:/DEV/Lizz/dist/connections/jira/cli.js transition PROJECT-123 "In Review"

# Add a comment
node C:/DEV/Lizz/dist/connections/jira/cli.js comment PROJECT-123 "PR created: https://..."
```
