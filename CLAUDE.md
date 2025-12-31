# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (智能任务助手 - Intelligent Task Assistant) designed for research assistance. It provides GPU resource querying, task management, knowledge base search, and OCR image recognition capabilities. The extension communicates with multiple external backend services for authentication, chat, and data storage.

## Architecture

### Extension Structure (Manifest V3)

- **[manifest.json](manifest.json)** - Chrome extension configuration
- **[background.js](background.js)** - Service worker for storage access (provides `user_id` to other components)

### Frontend Modules (popup/)

The extension uses a modular architecture where each feature is a separate HTML page within the `popup/` directory:

| Module | Files | Purpose |
|--------|-------|---------|
| Main Chat | [popup.html](popup/popup.html), [popup.js](popup/popup.js) | Primary chat interface with mode switching |
| Login/Register | [login/login.html](popup/login/login.html), [login/login.js](popup/login/login.js), [login/register.html](popup/login/login.html), [login/register.js](popup/login/register.js) | User authentication |
| Task Monitoring | [monitoring/monitoring.html](popup/monitoring/monitoring.html), [monitoring/monitoring.js](popup/monitoring/monitoring.js) | GPU and container usage monitoring |
| Knowledge Graph | [relation/relation.html](popup/relation/relation.html), [relation/relation.js](popup/relation/relation.js) | Interactive graph visualization using vis-network |
| Settings | [settings/settings.html](popup/settings/settings.html), [settings/settings.js](popup/settings/settings.js) | Custom AI model configuration |
| File Upload | [upfile/upload.html](popup/upfile/upload.html), [upfile/upload.js](popup/upfile/upload.js) | Document upload to vector database |

### Chat Modes

The main chat interface ([popup.js:337-364](popup/popup.js#L337-L364)) supports three modes:

1. **Task Assistant Mode** (`resource`) - Queries GPU resources and provides allocation recommendations
2. **Knowledge Base Mode** (`document`) - Searches local vector database for relevant information
3. **Image Recognition Mode** (`image`) - OCR-based text extraction from images

### Key External APIs

| Service | Base URL | Purpose |
|---------|----------|---------|
| Flask Backend | `http://10.100.1.122:5000` | User auth, chat history, suggestions, OCR |
| AnythingLLM | `http://10.100.1.122:3001/api` | Default AI chat, document embeddings |
| GPU Monitoring | `http://10.100.1.98:8000/g{1,2,3}` | Real-time GPU status |
| Graph API | `http://10.100.1.122:5002` | Knowledge graph data |
| Container Records | `http://10.100.1.97:30668/user_{userId}/_search` | Container usage history |

### Authentication Flow

User ID is stored in `chrome.storage.local` as `user_id`:

1. On [popup.html](popup/popup.html) load, checks for `user_id` in storage
2. If not found, redirects to [login/login.html](popup/login/login.html)
3. Login stores `user_id` and returns to main popup
4. Other modules use `chrome.storage.local.get('user_id')` for API requests

## Development

### Loading the Extension

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project root directory

### Debugging

- **Frontend**: Right-click extension icon → Inspect popup, or use Chrome DevTools
- **Background Service Worker**: `chrome://extensions/` → Service worker link
- **Network**: Check Network tab in DevTools for API calls to backend services

### Making Changes

- **UI changes**: Edit HTML/CSS in the respective `popup/` subdirectory
- **Logic changes**: Edit corresponding JS files
- **New features**: Consider creating a new module in `popup/` with separate HTML/JS files

### Common Patterns

**User ID retrieval** (used across modules):
```javascript
function getUserId() {
    return new Promise((resolve) => {
        chrome.storage.local.get('user_id', (data) => {
            resolve(data.user_id || null);
        });
    });
}
```

**Model configuration** for AI chat:
- Default: AnythingLLM workspace at `http://10.100.1.122:3001/api/v1/workspace/sspu/chat`
- Custom: User-configurable via settings, stored in `chrome.storage.local` as `modelConfig`

### Key Files to Understand

- **[popup.js](popup/popup.js)** - Main chat logic, GPU fetching, mode switching, markdown rendering
- **[monitoring.js](popup/monitoring/monitoring.js)** - GPU monitoring implementation, shows how to fetch from GPU endpoints
- **[settings.js](popup/settings/settings.js)** - Model configuration pattern using chrome.storage
- **[relation.js](popup/relation/relation.js)** - vis-network graph visualization example

### Third-Party Libraries

Located in [lib/](lib/):
- **marked.min.js** - Markdown rendering
- **highlight.min.js** - Code syntax highlighting
- **purify.min.js** - HTML sanitization
- **vis-network.min.js** - Network graph visualization
