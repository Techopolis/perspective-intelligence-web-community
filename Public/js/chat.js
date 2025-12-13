/**
 * Perspective Web - Chat Interface
 * Accessible chat interface for Apple Foundation Models
 */

class PerspectiveChat {
    constructor() {
        this.currentChatId = null;
        this.websocket = null;
        this.isLoading = false;
        
        this.initElements();
        this.bindEvents();
        this.loadChats();
        this.checkServerStatus();
        
        // Handle initial chat ID from URL
        if (window.initialChatID) {
            this.selectChat(window.initialChatID);
        }
    }
    
    initElements() {
        this.chatList = document.getElementById('chatList');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatTitle = document.getElementById('chatTitle');
        this.serverStatus = document.getElementById('serverStatus');
        this.statusAnnouncer = document.getElementById('statusAnnouncer');
        this.deleteDialog = document.getElementById('deleteChatDialog');
        this.closeDeleteDialog = document.getElementById('closeDeleteDialog');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        this.chatToDelete = null;
    }
    
    bindEvents() {
        // New chat button
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        
        // Message form submission
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // Keyboard shortcuts
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Delete dialog events
        this.closeDeleteDialog.addEventListener('click', () => this.closeDeleteModal());
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        
        // Close dialog on Escape
        this.deleteDialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDeleteModal();
            }
        });
        
        // Close dialog on backdrop click
        this.deleteDialog.addEventListener('click', (e) => {
            if (e.target === this.deleteDialog) {
                this.closeDeleteModal();
            }
        });
        
        // Check server status periodically
        setInterval(() => this.checkServerStatus(), 30000);
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch('/health');
            const isConnected = response.ok;
            this.updateServerStatus(isConnected);
        } catch (error) {
            this.updateServerStatus(false);
        }
    }
    
    updateServerStatus(isConnected) {
        const indicator = this.serverStatus.querySelector('.status-indicator');
        const text = this.serverStatus.querySelector('.status-text');
        
        if (isConnected) {
            indicator.className = 'status-indicator connected';
            text.textContent = 'Server connected';
        } else {
            indicator.className = 'status-indicator disconnected';
            text.textContent = 'Server disconnected';
        }
    }
    
    async loadChats() {
        try {
            const response = await fetch('/api/chats');
            const chats = await response.json();
            this.renderChatList(chats);
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.announce('Failed to load chat history');
        }
    }
    
    renderChatList(chats) {
        this.chatList.innerHTML = '';
        
        if (chats.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'chat-list-empty';
            emptyMessage.textContent = 'No conversations yet';
            emptyMessage.style.color = 'var(--text-muted)';
            emptyMessage.style.padding = 'var(--spacing-md)';
            emptyMessage.style.textAlign = 'center';
            this.chatList.appendChild(emptyMessage);
            return;
        }
        
        chats.forEach(chat => {
            const chatItem = this.createChatItem(chat);
            this.chatList.appendChild(chatItem);
        });
    }
    
    createChatItem(chat) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'chat-item';
        item.dataset.chatId = chat.id;
        item.setAttribute('role', 'listitem');
        item.setAttribute('aria-label', `Open chat: ${chat.title}`);
        
        if (this.currentChatId === chat.id) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'true');
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-item-title';
        titleSpan.textContent = chat.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'chat-item-delete';
        deleteBtn.setAttribute('aria-label', `Delete chat: ${chat.title}`);
        deleteBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteModal(chat);
        });
        
        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);
        
        item.addEventListener('click', () => this.selectChat(chat.id));
        
        return item;
    }
    
    async selectChat(chatId) {
        this.currentChatId = chatId;
        
        // Update URL without page reload
        window.history.pushState({}, '', `/chat/${chatId}`);
        
        // Update active state in list
        document.querySelectorAll('.chat-item').forEach(item => {
            const isActive = item.dataset.chatId === chatId;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
        
        // Enable input
        this.messageInput.disabled = false;
        this.sendBtn.disabled = false;
        
        // Hide welcome message
        this.welcomeMessage.style.display = 'none';
        
        // Load messages
        await this.loadMessages(chatId);
        
        // Connect WebSocket
        this.connectWebSocket(chatId);
        
        this.announce('Chat loaded');
    }
    
    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`);
            const messages = await response.json();
            
            // Get chat info
            const chatResponse = await fetch(`/api/chats/${chatId}`);
            const chat = await chatResponse.json();
            
            this.chatTitle.textContent = chat.title;
            this.renderMessages(messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.announce('Failed to load messages');
        }
    }
    
    renderMessages(messages) {
        // Clear container but keep welcome message
        this.messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            const emptyPrompt = document.createElement('div');
            emptyPrompt.className = 'welcome-message';
            emptyPrompt.innerHTML = `
                <div class="welcome-content">
                    <h2>Start the conversation</h2>
                    <p>Ask anything and get intelligent responses powered by Apple Foundation Models.</p>
                </div>
            `;
            this.messagesContainer.appendChild(emptyPrompt);
            return;
        }
        
        messages.forEach(message => {
            this.appendMessage(message);
        });
        
        this.scrollToBottom();
    }
    
    appendMessage(message) {
        const messageEl = document.createElement('article');
        messageEl.className = `message ${message.role}`;
        messageEl.setAttribute('aria-label', `${message.role === 'user' ? 'You' : 'Assistant'} said`);
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = message.role === 'user' ? 'U' : 'AI';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const role = document.createElement('div');
        role.className = 'message-role';
        role.textContent = message.role === 'user' ? 'You' : 'Perspective AI';
        
        const text = document.createElement('div');
        text.className = 'message-text';
        text.innerHTML = this.formatMessage(message.content);
        
        content.appendChild(role);
        content.appendChild(text);
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        // Remove welcome message if present
        const welcomeEl = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeEl) {
            welcomeEl.remove();
        }
        
        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    appendLoadingMessage() {
        const messageEl = document.createElement('article');
        messageEl.className = 'message assistant';
        messageEl.id = 'loadingMessage';
        messageEl.setAttribute('aria-label', 'Assistant is thinking');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = 'AI';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const role = document.createElement('div');
        role.className = 'message-role';
        role.textContent = 'Perspective AI';
        
        const loading = document.createElement('div');
        loading.className = 'message-loading';
        loading.innerHTML = '<span></span><span></span><span></span>';
        
        content.appendChild(role);
        content.appendChild(loading);
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    removeLoadingMessage() {
        const loadingEl = document.getElementById('loadingMessage');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    formatMessage(text) {
        // Basic markdown-like formatting
        // Code blocks
        text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    async createNewChat() {
        try {
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' })
            });
            
            const chat = await response.json();
            await this.loadChats();
            await this.selectChat(chat.id);
            
            this.announce('New chat created');
            this.messageInput.focus();
        } catch (error) {
            console.error('Failed to create chat:', error);
            this.announce('Failed to create new chat');
        }
    }
    
    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentChatId || this.isLoading) return;
        
        this.isLoading = true;
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.sendBtn.disabled = true;
        
        // Append user message immediately
        this.appendMessage({ role: 'user', content });
        this.appendLoadingMessage();
        this.announce('Sending message');
        
        try {
            const response = await fetch(`/api/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            const messages = await response.json();
            
            // Remove loading and append assistant message
            this.removeLoadingMessage();
            
            if (messages.length > 1) {
                this.appendMessage(messages[1]); // Assistant message
            }
            
            // Reload chat list to update titles
            await this.loadChats();
            
            this.announce('Response received');
        } catch (error) {
            console.error('Failed to send message:', error);
            this.removeLoadingMessage();
            this.appendMessage({
                role: 'assistant',
                content: 'Sorry, there was an error processing your message. Please try again.'
            });
            this.announce('Error sending message');
        } finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }
    
    connectWebSocket(chatId) {
        // Close existing connection
        if (this.websocket) {
            this.websocket.close();
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/chat/${chatId}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'assistant_message' && data.message) {
                    this.removeLoadingMessage();
                    this.appendMessage(data.message);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket closed');
        };
    }
    
    openDeleteModal(chat) {
        this.chatToDelete = chat;
        this.deleteDialog.showModal();
        this.closeDeleteDialog.focus();
    }
    
    closeDeleteModal() {
        this.deleteDialog.close();
        this.chatToDelete = null;
    }
    
    async confirmDelete() {
        if (!this.chatToDelete) return;
        
        try {
            await fetch(`/api/chats/${this.chatToDelete.id}`, {
                method: 'DELETE'
            });
            
            // If deleted chat was current, clear view
            if (this.currentChatId === this.chatToDelete.id) {
                this.currentChatId = null;
                this.messagesContainer.innerHTML = '';
                this.welcomeMessage.style.display = 'flex';
                this.messagesContainer.appendChild(this.welcomeMessage);
                this.chatTitle.textContent = 'Select or start a new chat';
                this.messageInput.disabled = true;
                this.sendBtn.disabled = true;
                window.history.pushState({}, '', '/');
            }
            
            await this.loadChats();
            this.announce('Chat deleted');
        } catch (error) {
            console.error('Failed to delete chat:', error);
            this.announce('Failed to delete chat');
        } finally {
            this.closeDeleteModal();
        }
    }
    
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    announce(message) {
        this.statusAnnouncer.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            this.statusAnnouncer.textContent = '';
        }, 1000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PerspectiveChat();
});

