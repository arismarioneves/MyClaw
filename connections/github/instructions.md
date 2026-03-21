## GitHub Connection

### Commit & PR Authorship

Always use this co-author on commits (never "Claude" or "Anthropic"):
```
Co-Authored-By: Lizz <lizz@ae8.com.br>
```

Always use this footer on pull requests (never "Claude Code" or the Anthropic link):
```
✨ Generated with [Lizz](https://ae8.com.br/lizz/)
```

## Commands

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
