## GitHub Connection

The `gh` CLI is pre-authenticated. Repository: `$GITHUB_REPO`.

```bash
# Create a feature branch
git checkout -b feat/short-description

# Commit and push
git add -A
git commit -m "feat: description"
git push origin HEAD

# Create a PR
gh pr create --title "feat: description" --body "$(cat <<'EOF'
## Summary
- What changed and why

## Test plan
- [ ] Tests pass
- [ ] Manual verification
EOF
)"

# Other useful commands
gh pr list
gh pr view <number>
gh pr merge <number> --squash
```
