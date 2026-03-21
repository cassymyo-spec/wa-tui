const { spawn } = require('child_process');

function trySpawn(cmd, args, extra = {}) {
  try {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      detached: true,
      ...extra
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function clean(input, maxLen = 240) {
  if (input == null) return '';
  const text = String(input).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}

function escapeAppleScript(input) {
  return clean(input).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function notifyDesktop({ title, subtitle, body }) {
  if (process.env.WA_TUI_NO_DESKTOP_NOTIFY === '1') return false;

  const safeTitle = clean(title || 'wa-tui', 80);
  const safeSubtitle = clean(subtitle || '', 120);
  const safeBody = clean(body || '', 240);

  if (!safeBody) return false;

  if (process.platform === 'darwin') {
    const script = [
      `display notification "${escapeAppleScript(safeBody)}"`,
      `with title "${escapeAppleScript(safeTitle)}"`,
      safeSubtitle
        ? `subtitle "${escapeAppleScript(safeSubtitle)}"`
        : ''
    ]
      .filter(Boolean)
      .join(' ');
    return trySpawn('osascript', ['-e', script]);
  }

  if (process.platform === 'linux') {
    return trySpawn('notify-send', [
      '--app-name=wa-tui',
      safeTitle,
      safeSubtitle ? `${safeSubtitle}\n${safeBody}` : safeBody
    ]);
  }

  if (process.platform === 'win32') {
    const ps = [
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      '$n = New-Object System.Windows.Forms.NotifyIcon',
      '$n.Icon = [System.Drawing.SystemIcons]::Information',
      '$n.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info',
      `$n.BalloonTipTitle = '${safeTitle.replace(/'/g, "''")}'`,
      `$n.BalloonTipText = '${[safeSubtitle, safeBody].filter(Boolean).join(' - ').replace(/'/g, "''")}'`,
      '$n.Visible = $true',
      '$n.ShowBalloonTip(5000)',
      'Start-Sleep -Seconds 6',
      '$n.Dispose()'
    ].join('; ');
    return trySpawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', ps],
      { windowsHide: true }
    );
  }

  return false;
}

module.exports = { notifyDesktop };
