<p align="center">
<pre>
███╗   ███╗██╗   ██╗     ██████╗██╗      █████╗ ██╗    ██╗
████╗ ████║╚██╗ ██╔╝    ██╔════╝██║     ██╔══██╗██║    ██║
██╔████╔██║ ╚████╔╝     ██║     ██║     ███████║██║ █╗ ██║
██║╚██╔╝██║  ╚██╔╝      ██║     ██║     ██╔══██║██║███╗██║
██║ ╚═╝ ██║   ██║       ╚██████╗███████╗██║  ██║╚███╔███╔╝
╚═╝     ╚═╝   ╚═╝        ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝
</pre>
</p>

<p align="center">
  <b>Control your computer from Telegram using Claude Code.</b><br>
  Simple. Lightweight. No hassle.
</p>

<p align="center">
  <a href="README.pt-BR.md">Leia em Português</a>
</p>

---

## What is MyClaw?

MyClaw is a **lightweight, simplified** version of OpenClaw. It connects **Claude Code** to **Telegram**, letting you remotely control your computer from anywhere, straight from chat.

The project reuses Claude Code's secure environment (skills, sessions, and coworking), but with a permission bypass that gives full system access, not just the coworking folder.

### How it works

```
You (Telegram) → MyClaw Bot → Claude Code → Your computer
```

1. You send a message on Telegram
2. The bot forwards it to Claude Code
3. Claude executes the action on your computer
4. The response comes back to Telegram

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **Node.js** | >= 20 |
| **Claude Code CLI** | Installed and logged in (`claude login`) |
| **Telegram** | An account + bot created via [@BotFather](https://t.me/BotFather) |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arismarioneves/MyClaw.git
cd MyClaw
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the interactive setup

```bash
npm run setup
```

The setup will:
- ✅ Check that Node.js and Claude CLI are installed
- ✅ Build the project (TypeScript → JavaScript)
- ✅ Ask for your Telegram **bot token**
- ✅ Open `MYCLAW.md` for you to personalize the assistant
- ✅ Create the `.env` file with your configuration
- ✅ Offer to install as a background service (optional)

### 4. Start the bot

```bash
npm run start
```

Done! Open Telegram and send a message to your bot.

---

## Getting your Bot Token

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts (pick any name and username)
4. Copy the token it gives you (format: `123456:ABCdef...`)

## Chat ID (automatic)

The Chat ID is registered **automatically**. Just send `/start` to your bot on Telegram.

The bot detects your ID and saves it to `.env`. No manual copying needed.

---

## Available Commands

### Telegram

| Command | Description |
|---------|-------------|
| `/start` | Starts the bot and registers your Chat ID |
| `/chatid` | Shows your Chat ID |
| `/newchat` | Clears the session and starts a new conversation |
| `/forget` | Clears the current session |
| `/memory` | Shows stored memories |
| `/schedule list` | Lists scheduled tasks |
| `/schedule pause <id>` | Pauses a task |
| `/schedule resume <id>` | Resumes a paused task |
| `/schedule delete <id>` | Deletes a task |

### Terminal

| Command | Description |
|---------|-------------|
| `npm run start` | Start the bot (production) |
| `npm run dev` | Start in dev mode (hot reload) |
| `npm run setup` | Run the setup wizard |
| `npm run status` | Check configuration health |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run tests |

---

## Task Scheduling

You can schedule the bot to run prompts automatically:

```bash
node dist/schedule-cli.js create "Summarize my emails" "0 9 * * *" YOUR_CHAT_ID
```

Cron examples:

| Pattern | Frequency |
|---------|-----------|
| `0 9 * * *` | Every day at 9am |
| `0 9 * * 1` | Every Monday at 9am |
| `0 */4 * * *` | Every 4 hours |

---

## Personalization

Edit **`MYCLAW.md`** in the project root to customize:

- Assistant name
- Personality and tone
- Available skills
- Formatting rules

You can edit this file at any time. Changes take effect on the next message.

---

## Media Support

The bot accepts:

- 📷 **Photos** — Send an image on Telegram and Claude will analyze it
- 📄 **Documents** — Send files for Claude to process

---

## Compatible Operating Systems

| OS | Support | Background service |
|----|---------|-------------------|
| **Windows** | ✅ | Via PM2 (`pm2 start dist/index.js --name myclaw`) |
| **macOS** | ✅ | Via launchd (auto-configured by setup) |
| **Linux** | ✅ | Via systemd (auto-configured by setup) |

---

## Project Structure

```
MyClaw/
├── src/
│   ├── index.ts        # Entry point
│   ├── bot.ts          # Telegram bot logic (grammY)
│   ├── agent.ts        # Claude Code integration
│   ├── config.ts       # Configuration
│   ├── db.ts           # SQLite database (sessions, memories, tasks)
│   ├── memory.ts       # Memory system with decay
│   ├── scheduler.ts    # Task scheduler (cron)
│   ├── media.ts        # Media download and processing
│   ├── format.ts       # Telegram message formatting
│   └── logger.ts       # Logger (pino)
├── scripts/
│   ├── setup.ts        # Interactive setup wizard
│   ├── status.ts       # Health checker
│   └── notify.sh       # Notification script
├── MYCLAW.md           # Assistant personality
├── .env.example        # Environment variables example
├── package.json
└── tsconfig.json
```

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token (from @BotFather) |
| `ALLOWED_CHAT_ID` | ❌ | Your Chat ID (auto-registered on first `/start`) |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API key (optional, uses `claude login` by default) |
| `LOG_LEVEL` | ❌ | Log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`) |

---

## Quick Start

```bash
git clone https://github.com/arismarioneves/MyClaw.git
cd MyClaw
npm install
npm run setup
npm run start
```

5 commands. That's it.

---

<p align="center">
  <sub>Make your day better with MyClaw</sub>
</p>
