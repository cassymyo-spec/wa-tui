const state = {
  screen: 'loading', // 'loading', 'qr', 'chats', 'chatDetail'
  qr: null,
  chats: [],
  currentChatId: null,
  currentChatName: null,
  currentRawChat: null,
  currentMessages: [],
  filter: 'all', // 'all', 'direct', 'groups'
  unreadOnly: false,
  page: 1,
  pageSize: 10,
  loading: true,
  error: null,
  unreadCount: 0
};

module.exports = state;
