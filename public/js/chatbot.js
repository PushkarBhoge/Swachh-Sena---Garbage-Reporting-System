class ChatbotWidget {
  constructor() {
    this.isMinimized = true;
    this.isLoading = false;
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
    this.loadHistory();
  }

  createWidget() {
    const widget = document.createElement('div');
    widget.className = 'chatbot-widget minimized';
    widget.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header-info">
          <img src="/assets/logo-eng.png" alt="Swachh Sena" class="chatbot-header-logo" id="chatHeaderLogo">
          <div class="chatbot-header-text">
            <h4>Swachh Sena</h4>
            <span><span class="chatbot-online-dot"></span> Online</span>
          </div>
        </div>
        <div class="chatbot-header-actions">
          <button class="chatbot-header-btn" id="clearChatBtn" title="Clear chat">🗑️</button>
          <button class="chatbot-header-btn" id="minimizeBtn" title="Minimize">−</button>
        </div>
      </div>
      <div class="chatbot-messages" id="chatMessages"></div>
      <div class="chatbot-input-area">
        <textarea class="chatbot-input" id="chatInput" placeholder="Ask me anything..." rows="1"></textarea>
        <button class="chatbot-send-btn" id="sendBtn" title="Send">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11z"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(widget);
    this.widget = widget;
    this.messagesContainer = widget.querySelector('#chatMessages');
    this.input = widget.querySelector('#chatInput');
    this.sendBtn = widget.querySelector('#sendBtn');
  }

  attachEventListeners() {
    this.widget.querySelector('.chatbot-header').addEventListener('click', () => this.toggleMinimize());
    this.widget.querySelector('#minimizeBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
    this.widget.querySelector('#clearChatBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearChat();
    });
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    // sync logo with language selector
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
      langSelector.addEventListener('change', () => {
        const logo = this.widget.querySelector('#chatHeaderLogo');
        if (logo) logo.src = langSelector.value === 'mr' ? '/assets/logo-mr.png' : '/assets/logo-eng.png';
      });
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.widget.classList.toggle('minimized');
  }

  async loadHistory() {
    try {
      const response = await fetch('/api/chat/history');
      if (response.status === 403) {
        this.displayMessage('👋 Hi! I am your Swachh Sena assistant.\n\nI can help you with:\n• How to report garbage in your area\n• Checking the status of your complaints\n• Learning about our cleanup work\n• Donating to support us\n\nWhat would you like to know?', 'bot');
        this.setGuestMode(true);
        return;
      }
      const data = await response.json();
      if (data.success && data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          this.displayMessage(msg.message, msg.sender);
        });
      } else {
        this.displayMessage('👋 Hi! I am your Swachh Sena assistant.\n\nI can help you with:\n• How to report garbage in your area\n• Checking the status of your complaints\n• Learning about our cleanup work\n• Donating to support us\n\nWhat would you like to know?', 'bot');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  setGuestMode(isGuest) {
    if (!isGuest) return;
    this.isGuest = true;
    this.input.placeholder = 'Login to chat...';
    this.input.disabled = true;
    this.sendBtn.disabled = true;
    this.widget.querySelector('#clearChatBtn').style.display = 'none';
  }

  displayMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}`;
    const escaped = this.escapeHtml(message).replace(/\n/g, '<br>');
    messageDiv.innerHTML = `<div class="chatbot-message-content">${escaped}</div>`;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  displayLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chatbot-message bot';
    loadingDiv.id = 'loadingMessage';
    loadingDiv.innerHTML = `
      <div class="chatbot-loading">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    this.messagesContainer.appendChild(loadingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  removeLoading() {
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading || this.isGuest) return;

    this.isLoading = true;
    this.sendBtn.disabled = true;
    this.displayMessage(message, 'user');
    this.input.value = '';
    this.displayLoading();

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      this.removeLoading();

      if (data.success) {
        this.displayMessage(data.botResponse, 'bot');
      } else {
        this.displayMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.removeLoading();
      this.displayMessage('Sorry, I encountered an error. Please try again.', 'bot');
    } finally {
      this.isLoading = false;
      this.sendBtn.disabled = false;
      this.input.focus();
    }
  }

  async clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      const response = await fetch('/api/chat/clear', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        this.messagesContainer.innerHTML = '';
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chatbot when DOM is ready - skip for admin pages
if (!document.body.classList.contains('admin-page')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChatbotWidget());
  } else {
    new ChatbotWidget();
  }
}
