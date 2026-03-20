# wa-tui

Terminal UI for WhatsApp Web, built with [neo-blessed](https://www.npmjs.com/package/neo-blessed) and [whatsapp-web.js](https://wwebjs.dev/). Scan a QR code in the terminal, then browse chats, read messages, reply, and download media without leaving your shell.

## Requirements

- **Node.js** 18 or newer  
- **Google Chrome** or **Chromium** installed locally — `whatsapp-web.js` drives a headless browser session; if startup fails, install Chrome or point Puppeteer at your binary (see [whatsapp-web.js docs](https://docs.wwebjs.dev/)).

Session data and cache are stored under `.wwebjs_auth` and `.wwebjs_cache` in the current working directory (and settings under `~/.wa-tui/`).

## Install

```bash
npm install -g @gtchakama/wa-tui
```

Or run without a global install:

```bash
npx @gtchakama/wa-tui
```

From a git checkout:

```bash
npm install
npm start
```

## Usage

```bash
wa-tui
```

On first run, scan the QR code shown in the terminal with WhatsApp on your phone (**Linked devices**).

### Environment variables

| Variable | Description |
| -------- | ----------- |
| `WA_TUI_RESIZE` | Set to `1` to enable resize-related behavior used during development (`npm run start:resize`). |
| `WA_TUI_NO_SOUND` | Set to `1` to disable the incoming-message notification sound. |
| `WA_TUI_SOUND` | Optional path to an audio file (macOS: `afplay`; Linux: `paplay` / `aplay`). Overrides the default tone. |

Incoming messages play a short sound when you are **not** viewing that chat. Defaults: **macOS** — `Ping.aiff` via `afplay`; **Windows** — short two-tone console beep; **Linux** — freedesktop `complete.oga` or `message.oga`, then WAV fallback; otherwise the terminal bell. There is no sound for your own messages or for messages in the chat you currently have open.

## Scripts (development)

| Command | Description |
| ------- | ----------- |
| `npm start` | Run the TUI |
| `npm run start:resize` | Run with `WA_TUI_RESIZE=1` |

## Disclaimer

WhatsApp’s terms of service apply to any client you use. This project is an unofficial interface; use it at your own risk.

## License

ISC
