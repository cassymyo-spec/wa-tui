const {
  Client,
  LocalAuth,
  MessageTypes
} = require('whatsapp-web.js');
const EventEmitter = require('events');
const { formatPeerLabel } = require('../utils/format');

async function resolveIncomingAuthor(msg, chat) {
  const isGroup = Boolean(chat && chat.isGroup);
  const peerTitle = (chat && (chat.name || chat.formattedTitle || '').trim()) || '';
  if (!isGroup) {
    if (peerTitle) return peerTitle;
    return formatPeerLabel(msg.author || msg.from);
  }
  try {
    const c = await msg.getContact();
    const n = (c.pushname || c.name || c.shortName || '').trim();
    if (n) return n;
  } catch (_) {}
  return formatPeerLabel(msg.author || msg.from);
}

/** Do not surface these as chat lines (noise / duplicate pipeline / non-user content). */
const SUPPRESSED_MESSAGE_TYPES = new Set([
  MessageTypes.E2E_NOTIFICATION,
  MessageTypes.PROTOCOL,
  MessageTypes.GP2,
  MessageTypes.CIPHERTEXT,
  MessageTypes.REACTION,
  MessageTypes.DEBUG,
  MessageTypes.BROADCAST_NOTIFICATION,
  MessageTypes.REVOKED
]);

function shouldEmitUserMessage(msg) {
  if (!msg || msg.isStatus || !msg.id?._serialized) return false;
  if (msg.broadcast) return false;
  if (SUPPRESSED_MESSAGE_TYPES.has(msg.type)) return false;
  const body = msg.body != null ? String(msg.body).trim() : '';
  if (!body && !msg.hasMedia) return false;
  return true;
}

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true, // Run in headless mode to not distract the user
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    this.ready = false;
  }

  initialize(onQr, onReady, onAuth) {
    this.client.on('qr', (qr) => {
      onQr(qr);
    });

    this.client.on('ready', () => {
      this.ready = true;
      onReady();
    });

    this.client.on('authenticated', () => {
      if (onAuth) onAuth();
    });

    // Single pipeline: message_create fires for every new Message (sent and received).
    // Use Message's routing jid (same as Message._getChatId): outgoing uses `to` (the chat),
    // incoming uses `from`. Avoid getChat() here — its id can differ (e.g. LID vs PN) from
    // the jid you opened from getChats(), which broke chatIdsMatch for sends.
    this.client.on('message_create', (msg) => {
      void (async () => {
        if (!shouldEmitUserMessage(msg)) return;

        const remote =
          msg.id &&
          msg.id.remote &&
          msg.id.remote !== 'status@broadcast'
            ? String(msg.id.remote)
            : '';
        const chatId = remote || (msg.fromMe ? msg.to : msg.from);

        let author = 'You';
        if (!msg.fromMe) {
          try {
            const chat = await msg.getChat();
            author = await resolveIncomingAuthor(msg, chat);
          } catch (_) {
            author = formatPeerLabel(msg.author || msg.from);
          }
        }

        this.emit('message', {
          id: msg.id._serialized,
          chatId,
          body: msg.body,
          timestamp: msg.timestamp,
          author,
          fromMe: msg.fromMe,
          type: msg.type,
          hasMedia: Boolean(msg.hasMedia)
        });
      })();
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failure:', msg);
    });

    return this.client.initialize();
  }

  async getChats() {
    const chats = await this.client.getChats();
    const sorted = chats.sort((a, b) => b.timestamp - a.timestamp);
    
    return sorted.map(chat => {
      // Better title resolution: formattedTitle usually contains the pushname or the contact name
      const title = chat.name || chat.formattedTitle || (chat.id && chat.id.user) || 'Unknown';
      
      return {
        id: chat.id._serialized,
        name: title,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount || 0,
        timestamp: chat.timestamp || 0,
        lastMessage: chat.lastMessage ? chat.lastMessage.body : '',
        raw: chat
      };
    });
  }

  async getMessages(chatId, limit = 10, rawChat = null) {
    try {
      let chat = rawChat;
      
      // If no raw chat, try getting all chats and finding it (avoids getChatById bug)
      if (!chat) {
        const chats = await this.getChats();
        const found = chats.find(c => c.id === chatId);
        if (found) chat = found.raw;
      }
      
      if (!chat) {
         // Final fallback
         chat = await this.client.getChatById(chatId).catch(() => null);
      }
      
      if (!chat || !chat.fetchMessages) return [];
      
      const messages = await chat.fetchMessages({ limit });
      const filtered = messages.filter((msg) => shouldEmitUserMessage(msg));
      return Promise.all(
        filtered.map(async (msg) => ({
          id: msg.id._serialized,
          body: msg.body,
          fromMe: msg.fromMe,
          author: msg.fromMe
            ? 'You'
            : await resolveIncomingAuthor(msg, chat),
          timestamp: msg.timestamp
        }))
      );
    } catch (err) {
      console.error('Error in getMessages:', err);
      return [];
    }
  }

  async sendMessage(chatId, text, rawChat = null) {
    try {
      if (rawChat && rawChat.sendMessage) {
        return rawChat.sendMessage(text);
      }
      if (chatId == null || chatId === '') {
        throw new Error('No chat selected');
      }
      return this.client.sendMessage(chatId, text);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      throw err;
    }
  }

  /** Ends the WA Web session and clears LocalAuth data (via client.logout). */
  async logoutSession() {
    this.ready = false;
    try {
      await this.client.logout();
    } catch (err) {
      console.error('Logout:', err.message || err);
      try {
        await this.client.destroy();
      } catch (_) {}
    }
  }
}

module.exports = new WhatsAppService();
