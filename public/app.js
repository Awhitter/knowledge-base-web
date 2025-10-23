// AgentBox Playground Application

let currentAgent = null;
let gatewayUrl = 'http://localhost:3000';
let threadId = null;

// Initialize
async function init() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        gatewayUrl = config.gatewayUrl;
    } catch (error) {
        console.error('Failed to load config:', error);
    }

    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Agent selection
    document.querySelectorAll('.agent-item').forEach(item => {
        item.addEventListener('click', () => selectAgent(item.dataset.agent));
    });

    // Send message
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Select an agent
function selectAgent(agentName) {
    currentAgent = agentName;
    threadId = null; // Reset thread when switching agents

    // Update UI
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.toggle('active', item.dataset.agent === agentName);
    });

    const agentNames = {
        'marketing': '🎯 Marketing Agent',
        'sales': '💼 Sales Agent',
        'research': '🔍 Research Agent',
        'data-analyst': '📊 Data Analyst Agent',
        'coordinator': '🎭 Coordinator Agent'
    };

    document.getElementById('chatTitle').textContent = agentNames[agentName] || 'Agent Chat';
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;

    // Clear chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div style="text-align: center; color: #999; margin-top: 50px;">
            <p>Start a conversation with ${agentNames[agentName]}</p>
        </div>
    `;
}

// Send message to agent
async function sendMessage() {
    if (!currentAgent) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to chat
    addMessage('user', message);

    // Disable input while processing
    input.disabled = true;
    document.getElementById('sendButton').disabled = true;

    try {
        // Show loading indicator
        const loadingId = addMessage('agent', '<div class="loading"></div>', true);

        // Send to agent via gateway
        const response = await fetch(`${gatewayUrl}/api/agents/${currentAgent}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                threadId,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Remove loading indicator
        removeMessage(loadingId);

        // Add agent response
        addMessage('agent', data.response || data.result || JSON.stringify(data));

        // Save thread ID for conversation continuity
        if (data.threadId) {
            threadId = data.threadId;
        }

    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('agent', `❌ Error: ${error.message}`, false, true);
    } finally {
        // Re-enable input
        input.disabled = false;
        document.getElementById('sendButton').disabled = false;
        input.focus();
    }
}

// Add message to chat
function addMessage(role, content, isLoading = false, isError = false) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Remove welcome message if present
    if (chatMessages.querySelector('div[style*="text-align: center"]')) {
        chatMessages.innerHTML = '';
    }

    const messageId = `msg-${Date.now()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.id = messageId;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'A';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (isError) {
        messageContent.classList.add('error');
    }
    
    if (isLoading) {
        messageContent.innerHTML = content;
    } else {
        messageContent.textContent = content;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageId;
}

// Remove message from chat
function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
