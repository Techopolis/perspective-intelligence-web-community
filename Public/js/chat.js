/**
 * Perspective Web - Chat Interface
 * Accessible chat interface for Apple Foundation Models
 */

class PerspectiveChat {
    constructor() {
        this.currentChatId = null;
        this.websocket = null;
        this.isLoading = false;
        this.selectedAgent = null;
        this.pickerHighlightIndex = -1;
        this.filteredAgents = [];

        // Available agents - add or remove entries here
        this.agents = [
            { id: 'general',    name: 'General',          icon: 'G',  desc: 'General-purpose assistant' },
            { id: 'code',       name: 'Code',             icon: '<>', desc: 'Code generation and debugging' },
            { id: 'writer',     name: 'Writer',           icon: 'W',  desc: 'Writing, editing, and proofreading' },
            { id: 'summarizer', name: 'Summarizer',       icon: 'S',  desc: 'Summarize long text or articles' },
            { id: 'translator', name: 'Translator',       icon: 'T',  desc: 'Translate between languages' },
            { id: 'creative',   name: 'Creative',         icon: 'C',  desc: 'Brainstorming and creative ideas' },
            { id: 'tutor',      name: 'Tutor',            icon: '?',  desc: 'Explain concepts step by step' },
            { id: 'accessibility', name: 'Accessibility', icon: 'A',  desc: 'Accessibility review and guidance' },
        ];

        this.initElements();
        this.bindEvents();
        this.checkServerStatus();

        // Load chats, then either select from URL or auto-create
        this.loadChats().then(() => {
            if (window.initialChatID) {
                this.selectChat(window.initialChatID);
            } else if (!this.currentChatId) {
                this.createNewChat();
            }
        });
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
        this.politeAnnouncer = document.getElementById('politeAnnouncer');
        this.tokenDisplay = document.getElementById('tokenDisplay');
        this.deleteDialog = document.getElementById('deleteChatDialog');
        this.closeDeleteDialog = document.getElementById('closeDeleteDialog');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.agentPicker = document.getElementById('agentPicker');
        this.agentPillContainer = document.getElementById('agentPillContainer');

        this.chatToDelete = null;
        this.activeAgentName = null;
    }
    
    bindEvents() {
        // New chat button
        this.newChatBtn.addEventListener('click', () => this.createNewChat());

        // Message form submission
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Auto-resize textarea + agent picker trigger
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.handlePickerInput();
        });

        // Keyboard shortcuts
        this.messageInput.addEventListener('keydown', (e) => {
            // When picker is open, handle navigation
            if (this.isPickerVisible()) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.movePickerHighlight(1);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.movePickerHighlight(-1);
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    if (this.pickerHighlightIndex >= 0 && this.filteredAgents[this.pickerHighlightIndex]) {
                        e.preventDefault();
                        this.selectAgent(this.filteredAgents[this.pickerHighlightIndex]);
                        return;
                    }
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hidePicker();
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.agentPicker.contains(e.target) && e.target !== this.messageInput) {
                this.hidePicker();
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
        // role="listitem" removed — buttons inside role="list" are valid children
        // and the explicit role conflicts with the implicit button role
        
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
                    <h2>Start the Conversation</h2>
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
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}`;
        const roleLabel = message.role === 'user' ? 'You' : 'Perspective AI';
        messageEl.setAttribute('role', 'article');
        messageEl.setAttribute('aria-label', `${roleLabel} message`);
        messageEl.setAttribute('tabindex', '0');

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = message.role === 'user' ? 'U' : 'AI';

        const content = document.createElement('div');
        content.className = 'message-content';

        const role = document.createElement('h3');
        role.className = 'message-role';
        role.textContent = roleLabel;
        
        const text = document.createElement('div');
        text.className = 'message-text';
        text.innerHTML = this.formatMessage(message.content);
        
        const copyBtn = this.createCopyButton(message.content);

        content.appendChild(role);
        content.appendChild(text);
        content.appendChild(copyBtn);

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
    
    appendLoadingMessage(agentName) {
        const label = agentName || 'Perspective AI';
        const messageEl = document.createElement('div');
        messageEl.className = 'message assistant';
        messageEl.id = 'loadingMessage';
        messageEl.setAttribute('aria-hidden', 'true');

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = 'AI';

        const content = document.createElement('div');
        content.className = 'message-content';

        const role = document.createElement('h3');
        role.className = 'message-role';
        role.textContent = label;

        const loading = document.createElement('div');
        loading.className = 'message-loading';
        loading.innerHTML = '<span></span><span></span><span></span>';

        content.appendChild(role);
        content.appendChild(loading);

        messageEl.appendChild(avatar);
        messageEl.appendChild(content);

        this.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();

        // Single clean announcement via the live region
        this.announce(`${label} is thinking`, 'polite');
    }
    
    removeLoadingMessage() {
        const loadingEl = document.getElementById('loadingMessage');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    formatMessage(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text, {
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false
            });
        }
        // Fallback if marked CDN fails to load
        text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
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

        // Append user message immediately (suppress announcement — the
        // "thinking" announcement that follows is the useful feedback)
        this.appendMessage({ role: 'user', content });
        this.announce('Message sent', 'polite');

        // Prefer WebSocket for streaming; fall back to HTTP POST
        const agentId = this.selectedAgent ? this.selectedAgent.id : null;
        const agent = this.selectedAgent;
        this.activeAgentName = agent ? agent.name : null;
        this.clearAgent({ silent: true });

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.appendLoadingMessage(this.activeAgentName);
            const payload = { content };
            if (agentId) payload.agent = agentId;
            this.websocket.send(JSON.stringify(payload));
            // Response handled by onmessage streaming handlers
        } else {
            this.appendLoadingMessage(this.activeAgentName);
            try {
                const body = { content };
                if (agentId) body.agent = agentId;
                const response = await fetch(`/api/chats/${this.currentChatId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const messages = await response.json();
                this.removeLoadingMessage();

                if (messages.length > 1) {
                    this.appendMessage(messages[1]);
                }

                await this.loadChats();
                const httpDoneName = this.activeAgentName || 'Perspective AI';
                this.announce(`${httpDoneName} responded`, 'polite');
                this.activeAgentName = null;
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

                switch (data.type) {
                    case 'stream_start': {
                        this.removeLoadingMessage();
                        // Resolve agent name from the server-reported agent ID
                        if (data.agent && data.agent !== 'general') {
                            const agent = this.agents.find(a => a.id === data.agent);
                            if (agent) this.activeAgentName = agent.name;
                        }
                        this.startStreamingMessage(data.agent);
                        const respondingName = this.activeAgentName || 'Perspective AI';
                        this.announce(`${respondingName} is responding`, 'polite');
                        break;
                    }

                    case 'chunk':
                        if (data.content) {
                            this.appendStreamChunk(data.content);
                        }
                        break;

                    case 'done': {
                        this.finalizeStreamingMessage(data.message);
                        this.updateTokenDisplay(data.promptTokens, data.completionTokens);
                        this.loadChats();
                        this.isLoading = false;
                        this.sendBtn.disabled = false;
                        this.messageInput.focus();
                        const doneName = this.activeAgentName || 'Perspective AI';
                        this.announce(`${doneName} responded`, 'polite');
                        this.activeAgentName = null;
                        break;
                    }

                    case 'error':
                        this.removeLoadingMessage();
                        this.finalizeStreamingMessage(null);
                        this.appendMessage({
                            role: 'assistant',
                            content: data.message || 'An error occurred'
                        });
                        this.isLoading = false;
                        this.sendBtn.disabled = false;
                        this.messageInput.focus();
                        this.announce('Error receiving response');
                        this.activeAgentName = null;
                        break;

                    // Backward compat: non-streaming assistant_message
                    case 'assistant_message':
                        if (data.message) {
                            this.removeLoadingMessage();
                            this.appendMessage(data.message);
                            this.isLoading = false;
                            this.sendBtn.disabled = false;
                            this.messageInput.focus();
                        }
                        break;
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
    
    startStreamingMessage(agentId) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message assistant streaming';
        messageEl.id = 'streamingMessage';
        messageEl.setAttribute('role', 'article');
        messageEl.setAttribute('aria-label', 'Perspective AI message');
        messageEl.setAttribute('tabindex', '0');
        // Hide from the role="log" live region until streaming is complete.
        // Announcing an empty in-progress element is not useful; a single
        // polite announcement fires in finalizeStreamingMessage instead.
        messageEl.setAttribute('aria-hidden', 'true');

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = 'AI';

        const content = document.createElement('div');
        content.className = 'message-content';

        const role = document.createElement('h3');
        role.className = 'message-role';
        role.textContent = 'Perspective AI';

        const text = document.createElement('div');
        text.className = 'message-text';

        content.appendChild(role);
        if (agentId && agentId !== 'general') {
            const agent = this.agents.find(a => a.id === agentId);
            if (agent) {
                const badge = document.createElement('span');
                badge.className = 'agent-badge';
                badge.setAttribute('aria-label', `Using ${agent.name} agent`);
                badge.textContent = `${agent.icon} ${agent.name}`;
                content.appendChild(badge);
            }
        }
        content.appendChild(text);
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);

        const welcomeEl = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeEl) welcomeEl.remove();

        this.messagesContainer.appendChild(messageEl);
        this.messagesContainer.setAttribute('aria-busy', 'true');
        this.streamingRawText = '';
        this.scrollToBottom();
    }

    appendStreamChunk(chunk) {
        this.streamingRawText = (this.streamingRawText || '') + chunk;
        const el = document.querySelector('#streamingMessage .message-text');
        if (el) {
            el.innerHTML = this.formatMessage(this.streamingRawText);
            this.scrollToBottom();
        }
    }

    finalizeStreamingMessage(finalMessage) {
        this.messagesContainer.removeAttribute('aria-busy');
        const el = document.getElementById('streamingMessage');
        if (el) {
            el.classList.remove('streaming');
            el.removeAttribute('id');
            // Make the completed message visible to assistive technology.
            el.removeAttribute('aria-hidden');
            const rawContent = finalMessage ? finalMessage.content : this.streamingRawText;
            if (finalMessage) {
                const textEl = el.querySelector('.message-text');
                if (textEl) {
                    textEl.innerHTML = this.formatMessage(finalMessage.content);
                }
            }
            const contentEl = el.querySelector('.message-content');
            if (contentEl && rawContent) {
                const copyBtn = this.createCopyButton(rawContent);
                contentEl.appendChild(copyBtn);
            }
        }
        this.streamingRawText = '';
    }

    createCopyButton(rawContent) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-copy-message';
        btn.setAttribute('aria-label', 'Copy message to clipboard');
        btn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';

        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(rawContent);
                btn.setAttribute('aria-label', 'Copied');
                btn.classList.add('copied');
                this.announce('Message copied to clipboard');
                setTimeout(() => {
                    btn.setAttribute('aria-label', 'Copy message to clipboard');
                    btn.classList.remove('copied');
                }, 2000);
            } catch {
                this.announce('Failed to copy message');
            }
        });

        return btn;
    }

    openDeleteModal(chat) {
        this.chatToDelete = chat;
        this.deleteDialogTrigger = document.activeElement;
        this.deleteDialog.showModal();
        this.closeDeleteDialog.focus();
    }

    closeDeleteModal() {
        this.deleteDialog.close();
        const trigger = this.deleteDialogTrigger;
        this.chatToDelete = null;
        this.deleteDialogTrigger = null;
        if (trigger && document.contains(trigger)) {
            trigger.focus();
        }
    }

    async confirmDelete() {
        if (!this.chatToDelete) return;

        const wasCurrentChat = this.currentChatId === this.chatToDelete.id;

        try {
            await fetch(`/api/chats/${this.chatToDelete.id}`, {
                method: 'DELETE'
            });

            // If deleted chat was current, clear view
            if (wasCurrentChat) {
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
            this.deleteDialog.close();
            this.chatToDelete = null;
            this.deleteDialogTrigger = null;
            if (wasCurrentChat) {
                this.newChatBtn.focus();
            } else {
                const nextItem = this.chatList.querySelector('.chat-item');
                if (nextItem) {
                    nextItem.focus();
                } else {
                    this.newChatBtn.focus();
                }
            }
        }
    }
    
    // ── Agent Picker Methods ──────────────────────

    handlePickerInput() {
        const text = this.messageInput.value;
        const cursorPos = this.messageInput.selectionStart;

        // Find the @ trigger: look backwards from cursor for an unmatched @
        const beforeCursor = text.slice(0, cursorPos);
        const atIndex = beforeCursor.lastIndexOf('@');

        if (atIndex === -1 || (atIndex > 0 && beforeCursor[atIndex - 1] !== ' ' && beforeCursor[atIndex - 1] !== '\n')) {
            this.hidePicker();
            return;
        }

        const query = beforeCursor.slice(atIndex + 1).toLowerCase();

        // Don't show picker if there's a space after the query (user moved on)
        if (query.includes(' ')) {
            this.hidePicker();
            return;
        }

        this.filteredAgents = this.agents.filter(a =>
            a.name.toLowerCase().includes(query) || a.id.includes(query)
        );

        if (this.filteredAgents.length === 0) {
            this.hidePicker();
            return;
        }

        this.pickerAtIndex = atIndex;
        this.renderPicker();
        this.showPicker();
    }

    renderPicker() {
        // Keep the header, clear items
        const header = this.agentPicker.querySelector('.agent-picker-header');
        this.agentPicker.innerHTML = '';
        this.agentPicker.appendChild(header);

        this.filteredAgents.forEach((agent, i) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'agent-picker-item';
            if (i === this.pickerHighlightIndex) item.classList.add('highlighted');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', i === this.pickerHighlightIndex ? 'true' : 'false');

            item.innerHTML = `
                <span class="agent-picker-item-icon" aria-hidden="true">${agent.icon}</span>
                <span class="agent-picker-item-info">
                    <span class="agent-picker-item-name">${agent.name}</span>
                    <span class="agent-picker-item-desc">${agent.desc}</span>
                </span>
            `;

            item.addEventListener('click', () => this.selectAgent(agent));
            this.agentPicker.appendChild(item);
        });
    }

    showPicker() {
        this.agentPicker.classList.add('visible');
        this.messageInput.setAttribute('aria-expanded', 'true');
    }

    hidePicker() {
        this.agentPicker.classList.remove('visible');
        this.messageInput.setAttribute('aria-expanded', 'false');
        this.pickerHighlightIndex = -1;
    }

    isPickerVisible() {
        return this.agentPicker.classList.contains('visible');
    }

    movePickerHighlight(direction) {
        const count = this.filteredAgents.length;
        if (count === 0) return;
        this.pickerHighlightIndex = (this.pickerHighlightIndex + direction + count) % count;
        this.renderPicker();

        // Scroll highlighted item into view
        const items = this.agentPicker.querySelectorAll('.agent-picker-item');
        if (items[this.pickerHighlightIndex]) {
            items[this.pickerHighlightIndex].scrollIntoView({ block: 'nearest' });
        }

        this.announce(`${this.filteredAgents[this.pickerHighlightIndex].name}: ${this.filteredAgents[this.pickerHighlightIndex].desc}`, 'polite');
    }

    selectAgent(agent) {
        this.selectedAgent = agent;
        this.hidePicker();

        // Remove the @query text from the input
        const text = this.messageInput.value;
        const before = text.slice(0, this.pickerAtIndex);
        const afterCursor = text.slice(this.messageInput.selectionStart);
        this.messageInput.value = before + afterCursor;
        this.messageInput.selectionStart = before.length;
        this.messageInput.selectionEnd = before.length;

        this.renderAgentPill();
        this.messageInput.focus();
        this.announce(`Selected agent: ${agent.name}`);
    }

    clearAgent({ silent = false } = {}) {
        this.selectedAgent = null;
        this.agentPillContainer.innerHTML = '';
        if (!silent) {
            this.messageInput.focus();
            this.announce('Agent cleared');
        }
    }

    renderAgentPill() {
        this.agentPillContainer.innerHTML = '';
        if (!this.selectedAgent) return;

        const pill = document.createElement('span');
        pill.className = 'agent-pill';
        pill.innerHTML = `
            <span>${this.selectedAgent.icon} ${this.selectedAgent.name}</span>
        `;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'agent-pill-remove';
        removeBtn.setAttribute('aria-label', `Remove ${this.selectedAgent.name} agent`);
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', () => this.clearAgent());

        pill.appendChild(removeBtn);
        this.agentPillContainer.appendChild(pill);
    }

    // ── End Agent Picker ────────────────────────

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    updateTokenDisplay(promptTokens, completionTokens) {
        if (!this.tokenDisplay) return;
        if (promptTokens == null && completionTokens == null) {
            this.tokenDisplay.textContent = '';
            return;
        }
        const parts = [];
        if (promptTokens != null) parts.push(`${promptTokens.toLocaleString()} prompt`);
        if (completionTokens != null) parts.push(`${completionTokens.toLocaleString()} response`);
        this.tokenDisplay.textContent = parts.join(' + ') + ' tokens';
    }

    announce(message, priority = 'assertive') {
        const target = priority === 'polite' ? this.politeAnnouncer : this.statusAnnouncer;
        target.textContent = '';
        requestAnimationFrame(() => {
            target.textContent = message;
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PerspectiveChat();
});

