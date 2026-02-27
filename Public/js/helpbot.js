/**
 * Techopolis Help Chatbot
 * Accessible multi-agent help widget with streaming and follow-up buttons
 */

class TechopolisHelpBot {
    constructor() {
        this.ws = null;
        this.isOpen = false;
        this.isLoading = false;
        this.conversationStarted = false;
        this.streamingEl = null;
        this.streamingRawText = '';

        this.initElements();
        if (!this.helpBtn) return;
        this.bindEvents();
    }

    initElements() {
        this.helpBtn = document.getElementById('helpBtn');
        this.helpDialog = document.getElementById('helpDialog');
        this.helpClose = document.getElementById('helpClose');
        this.helpMessages = document.getElementById('helpMessages');
        this.helpInput = document.getElementById('helpInput');
        this.helpSend = document.getElementById('helpSend');
        this.helpForm = document.getElementById('helpForm');
        this.helpAnnouncer = document.getElementById('helpAnnouncer');
    }

    bindEvents() {
        // FAB only opens — close is handled by X button and Escape
        this.helpBtn.addEventListener('click', () => this.open());
        this.helpClose.addEventListener('click', () => this.close());

        this.helpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.helpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Keyboard handling: Escape closes, Tab/Shift+Tab trapped
        this.helpDialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return;
            }

            // Manual focus trap — prevents focus from escaping in Safari/VoiceOver
            if (e.key === 'Tab') {
                const focusable = Array.from(this.helpDialog.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
                )).filter(el => !el.closest('[aria-hidden="true"]'));
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        });

        // Prevent native cancel (Escape) from closing without our cleanup
        this.helpDialog.addEventListener('cancel', (e) => {
            e.preventDefault();
            this.close();
        });

        // Safety: sync state if dialog is closed natively
        this.helpDialog.addEventListener('close', () => {
            this.isOpen = false;
            this.helpBtn.setAttribute('aria-expanded', 'false');
        });

        // Backdrop click closes dialog (mousedown avoids race with showModal)
        this.helpDialog.addEventListener('mousedown', (e) => {
            if (e.target === this.helpDialog) {
                this.close();
            }
        });
    }

    // ── Open / Close ──────────────────────

    open() {
        if (this.isOpen) return;

        this.helpDialog.showModal();
        this.isOpen = true;
        this.helpBtn.setAttribute('aria-expanded', 'true');

        const isFirstOpen = !this.conversationStarted;
        if (isFirstOpen) {
            this.showWelcome();
            this.conversationStarted = true;
        }

        this.connectWebSocket();

        // Delay focus so the dialog is fully rendered and the accessibility tree
        // is updated. A single requestAnimationFrame is insufficient for VoiceOver.
        setTimeout(() => {
            if (isFirstOpen) {
                // Focus the welcome message so VoiceOver reads it and the user
                // discovers the suggested question buttons below it.
                const firstMessage = this.helpMessages.querySelector('.help-message');
                if (firstMessage) {
                    firstMessage.focus();
                } else {
                    this.helpInput.focus();
                }
            } else {
                this.helpInput.focus();
            }
            this.announce('Help chat opened');
        }, 150);
    }

    close() {
        this.helpDialog.close();
        this.isOpen = false;
        this.helpBtn.setAttribute('aria-expanded', 'false');
        this.helpBtn.focus();
    }

    // ── WebSocket ──────────────────────

    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
        if (this.ws) this.ws.close();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/help`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Help WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWSMessage(data);
            } catch (err) {
                console.error('Help WS parse error:', err);
            }
        };

        this.ws.onerror = () => {
            console.error('Help WebSocket error');
        };

        this.ws.onclose = () => {
            console.log('Help WebSocket closed');
        };
    }

    handleWSMessage(data) {
        switch (data.type) {
            case 'agent':
                this.removeTyping();
                this.startBotStream(data.agentName || 'Techopolis Support');
                // No announcement needed — the typing indicator already
                // informed the user, and the agent name is in the message
                // header which they will read when the response finalizes.
                break;

            case 'chunk':
                if (data.content) {
                    this.appendStreamChunk(data.content);
                }
                break;

            case 'done': {
                this.finalizeBotStream(data.fullContent, data.followups);
                this.helpMessages.removeAttribute('aria-busy');
                this.isLoading = false;
                this.helpSend.disabled = false;
                // Polite announcement with navigation hint
                const hasFollowups = data.followups && data.followups.length > 0;
                const hint = hasFollowups
                    ? 'Response ready with suggested questions. Shift Tab to read.'
                    : 'Response ready. Shift Tab to read.';
                this.announce(hint);
                break;
            }

            case 'error':
                this.removeTyping();
                this.removeStreamingMessage();
                this.helpMessages.removeAttribute('aria-busy');
                this.appendBotMessage(
                    data.message || 'Something went wrong. Please try again.',
                    'Techopolis Support',
                    [{ label: 'Try again', value: 'Hello' }]
                );
                this.isLoading = false;
                this.helpSend.disabled = false;
                this.announce('Error occurred');
                break;
        }
    }

    // ── Welcome ──────────────────────

    showWelcome() {
        this.appendBotMessage(
            'Welcome to Techopolis support. What can I help you with?',
            'Techopolis Support',
            [
                { label: 'Apps & Products', value: 'What apps does Techopolis make?' },
                { label: 'Services', value: 'What services does Techopolis offer?' },
                { label: 'Courses', value: 'What courses do you have?' },
                { label: 'Getting Started', value: 'How do I get started with Techopolis?' },
            ]
        );
    }

    // ── Send Message ──────────────────────

    sendMessage(content) {
        content = content || this.helpInput.value.trim();
        if (!content || this.isLoading) return;

        this.helpInput.value = '';
        this.appendUserMessage(content);
        this.showTyping();
        this.isLoading = true;
        this.helpSend.disabled = true;

        // Move focus FIRST, before disabling the button that currently has focus.
        // If we disable buttons first, the focused element becomes unfocusable
        // and the browser drops focus outside the dialog.
        this.helpInput.focus();

        // Now safe to disable previous follow-up buttons and mark loading
        this.disableFollowups();
        this.helpMessages.setAttribute('aria-busy', 'true');

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connectWebSocket();
            const pending = content;
            this.ws.onopen = () => {
                this.ws.send(JSON.stringify({ content: pending }));
            };
        } else {
            this.ws.send(JSON.stringify({ content }));
        }
    }

    // ── User Messages ──────────────────────

    appendUserMessage(content) {
        const msg = document.createElement('div');
        msg.className = 'help-message help-user';
        msg.setAttribute('tabindex', '0');

        const role = document.createElement('h3');
        role.className = 'help-message-role';
        role.textContent = 'You';
        msg.appendChild(role);

        const text = document.createElement('div');
        text.className = 'help-message-text';
        text.textContent = content;
        msg.appendChild(text);

        this.helpMessages.appendChild(msg);
        this.scrollToBottom();
    }

    // ── Bot Messages ──────────────────────

    appendBotMessage(content, agentName, followups) {
        const label = agentName || 'Techopolis Support';
        const msg = document.createElement('div');
        msg.className = 'help-message help-bot';
        msg.setAttribute('tabindex', '0');

        const role = document.createElement('h3');
        role.className = 'help-bot-header';
        role.textContent = label;
        msg.appendChild(role);

        const text = document.createElement('div');
        text.className = 'help-message-text';
        text.innerHTML = this.formatMessage(content);
        msg.appendChild(text);

        if (followups && followups.length > 0) {
            const btns = this.createFollowupButtons(followups);
            msg.appendChild(btns);
        }

        this.helpMessages.appendChild(msg);
        this.scrollToBottom();
    }

    // ── Streaming ──────────────────────

    startBotStream(agentName) {
        const label = agentName || 'Techopolis Support';
        const msg = document.createElement('div');
        msg.className = 'help-message help-bot streaming';
        msg.id = 'helpStreamingMessage';
        msg.setAttribute('aria-hidden', 'true');
        msg.setAttribute('tabindex', '0');

        const role = document.createElement('h3');
        role.className = 'help-bot-header';
        role.textContent = agentName || 'Techopolis Support';
        msg.appendChild(role);

        const text = document.createElement('div');
        text.className = 'help-message-text';
        msg.appendChild(text);

        this.helpMessages.appendChild(msg);
        this.streamingEl = msg;
        this.streamingRawText = '';
        this.scrollToBottom();
    }

    appendStreamChunk(chunk) {
        this.streamingRawText += chunk;
        const textEl = this.streamingEl?.querySelector('.help-message-text');
        if (textEl) {
            // Strip any follow-up markers from the displayed streaming text
            const displayText = this.streamingRawText.replace(/\[?FOLLOWUP:[^\]\n]+\]?/g, '');
            textEl.innerHTML = this.formatMessage(displayText);
            this.scrollToBottom();
        }
    }

    finalizeBotStream(fullContent, followups) {
        if (!this.streamingEl) return;

        this.streamingEl.classList.remove('streaming');
        this.streamingEl.removeAttribute('id');
        this.streamingEl.removeAttribute('aria-hidden');

        const textEl = this.streamingEl.querySelector('.help-message-text');
        if (textEl && fullContent) {
            textEl.innerHTML = this.formatMessage(fullContent);
        }

        if (followups && followups.length > 0) {
            const btns = this.createFollowupButtons(followups);
            this.streamingEl.appendChild(btns);
        }

        this.streamingEl = null;
        this.streamingRawText = '';
        this.scrollToBottom();
    }

    removeStreamingMessage() {
        const el = document.getElementById('helpStreamingMessage');
        if (el) el.remove();
        this.streamingEl = null;
        this.streamingRawText = '';
    }

    // ── Follow-up Buttons ──────────────────────

    createFollowupButtons(followups) {
        const container = document.createElement('div');
        container.className = 'help-followups';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', 'Suggested questions');

        followups.forEach(f => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'help-followup-btn';
            btn.textContent = f.label;
            btn.addEventListener('click', () => {
                this.sendMessage(f.value);
            });
            container.appendChild(btn);
        });

        return container;
    }

    disableFollowups() {
        // Hide entire follow-up groups from screen readers — these are past suggestions
        const allGroups = this.helpMessages.querySelectorAll('.help-followups');
        allGroups.forEach(group => {
            group.setAttribute('aria-hidden', 'true');
        });
        const allBtns = this.helpMessages.querySelectorAll('.help-followup-btn');
        allBtns.forEach(btn => {
            btn.disabled = true;
        });
    }

    // ── Typing Indicator ──────────────────────

    showTyping() {
        const typing = document.createElement('div');
        typing.className = 'help-typing';
        typing.id = 'helpTyping';
        typing.setAttribute('aria-hidden', 'true');
        typing.innerHTML = '<span></span><span></span><span></span>';
        this.helpMessages.appendChild(typing);
        this.scrollToBottom();
        // Use the single announcer instead of a second live region
        this.announce('Thinking');
    }

    removeTyping() {
        const el = document.getElementById('helpTyping');
        if (el) el.remove();
    }

    // ── Utilities ──────────────────────

    formatMessage(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text, {
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false
            });
        }
        // Fallback
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    scrollToBottom() {
        this.helpMessages.scrollTop = this.helpMessages.scrollHeight;
    }

    announce(message) {
        if (!this.helpAnnouncer) return;
        // Clear first, then set after a real delay so screen readers detect the change.
        // requestAnimationFrame alone can collapse into the same paint frame.
        // setTimeout with 100ms guarantees the clear and set are perceived as two
        // separate DOM mutations, which is required for re-announcing identical text.
        this.helpAnnouncer.textContent = '';
        setTimeout(() => {
            this.helpAnnouncer.textContent = message;
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TechopolisHelpBot();
});
