document.addEventListener('DOMContentLoaded', function () {
    const conversationList = document.getElementById('conversation-list');
    const createConversationBtn = document.getElementById('create-conversation');
    const deleteConversationBtn = document.getElementById('delete-conversation');
    const uploadFileBtn = document.getElementById('upload-file');
    const fileInput = document.getElementById('file-upload');

    let conversations = [];

    // Function to create a new conversation
    createConversationBtn.addEventListener('click', async () => {
        const response = await fetch('https://your-flask-api.com/create-conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: 'New Conversation' })
        });

        const data = await response.json();
        conversations.push(data);
        renderConversations();
    });

    // Function to delete a conversation
    deleteConversationBtn.addEventListener('click', async () => {
        if (conversations.length > 0) {
            const conversationId = conversations[conversations.length - 1].id;
            await fetch(`https://your-flask-api.com/delete-conversation/${conversationId}`, {
                method: 'DELETE'
            });
            conversations.pop();
            renderConversations();
        }
    });

    // Function to upload a file
    uploadFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://your-flask-api.com/upload-file', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        alert(`File uploaded: ${data.filename}`);
    });

    // Function to render conversations
    function renderConversations() {
        conversationList.innerHTML = '';
        conversations.forEach(conversation => {
            const div = document.createElement('div');
            div.textContent = conversation.title;
            conversationList.appendChild(div);
        });
    }
});