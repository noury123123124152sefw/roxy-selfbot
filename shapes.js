const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class GeminiAPI {
    constructor() {
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        this.textModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        this.chatHistoryFile = path.join(__dirname, 'data', 'chat_history.json');
    }

    
    saveChatHistory(username, userMessage, aiResponse) {
        try {
            let history = {};
            
            
            if (fs.existsSync(this.chatHistoryFile)) {
                const data = fs.readFileSync(this.chatHistoryFile, 'utf8');
                history = JSON.parse(data);
            }
            
            
            if (!history[username]) {
                history[username] = [];
            }
            
            
            history[username].push({
                user: userMessage,
                ai: aiResponse
            });
            
            
            if (history[username].length > 5) {
                history[username] = history[username].slice(-5);
            }
            
            
            fs.writeFileSync(this.chatHistoryFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving chat history:', error.message);
        }
    }

    
    loadChatHistory(username) {
        try {
            if (fs.existsSync(this.chatHistoryFile)) {
                const data = fs.readFileSync(this.chatHistoryFile, 'utf8');
                const history = JSON.parse(data);
                return history[username] || [];
            }
            return [];
        } catch (error) {
            console.error('Error loading chat history:', error.message);
            return [];
        }
    }

    async generateResponse(message, userId, username, channelId = null) {
        try {
            
            const chatHistory = this.loadChatHistory(username);
            
            
            let fullPrompt = `system prompt: you are a human

core rule: act like a real human, reply in short responses of 2-10 words, and never mention that you are an AI or robot

`;
            
            
            if (chatHistory.length > 0) {
                chatHistory.forEach(entry => {
                    fullPrompt += `${username}: ${entry.user}\n`;
                    fullPrompt += `maki: ${entry.ai}\n\n`;
                });
            }
            
            
            fullPrompt += `${username}: ${message}\n`;
            fullPrompt += `maki: `;
            
            
            const result = await this.textModel.generateContent(fullPrompt);
            const response = await result.response;
            const responseText = response.text();
            
            
            this.saveChatHistory(username, message, responseText);
            
            return responseText;
        } catch (error) {
            console.error('Error calling Gemini API:', error.message);
            throw error;
        }
    }

    async handleCommand(command, userId) {
        
        if (command === '!help') {
            return null;
        }

        const supportedCommands = ['!reset', '!sleep', '!dashboard', '!info', '!web', '!imagine', '!wack'];
        
        if (!supportedCommands.includes(command)) {
            return null; 
        }

        try {
            
            const prompt = `[User ID: ${userId}] Execute command: ${command}`;
            
            
            const result = await this.textModel.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error processing command:', error.message);
            throw error;
        }
    }

    async processImageMessage(textContent, imageUrl, userId, username) {
        try {
            
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const imageBytes = new Uint8Array(arrayBuffer);

            
            const chatHistory = this.loadChatHistory(username);
            
            
            let fullPrompt = `system prompt: you are a human

core rule: act like a real human, reply in short responses of 2-10 words, and never mention that you are an AI or robot

`;
            
            
            if (chatHistory.length > 0) {
                chatHistory.forEach(entry => {
                    fullPrompt += `${username}: ${entry.user}\n`;
                    fullPrompt += `maki: ${entry.ai}\n\n`;
                });
            }
            
            
            fullPrompt += `${username}: ${textContent || "What's in this image?"}\n`;
            fullPrompt += `maki: `;

            
            const result = await this.textModel.generateContent([
                fullPrompt,
                {
                    inlineData: {
                        data: Buffer.from(imageBytes).toString('base64'),
                        mimeType: response.headers.get('content-type') || 'image/jpeg'
                    }
                }
            ]);
            
            const responseResult = await result.response;
            const responseText = responseResult.text();
            
            
            this.saveChatHistory(username, textContent || "What's in this image?", responseText);
            
            return responseText;
        } catch (error) {
            console.error('Error processing image message:', error.message);
            throw error;
        }
    }
}

module.exports = new GeminiAPI();