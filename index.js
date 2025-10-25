const { Client } = require('discord.js-selfbot-v13');
const commandManager = require('./commands');
const shapesAPI = require('./shapes');
require('dotenv').config();

// Function to process AI response URLs (kept for compatibility but simplified)
function processShapesFileUrls(message) {
    if (!message) return message;
    
    // Since we're using Gemini now, we don't need to process special URLs
    // But we'll keep this function for compatibility
    return message;
}

const client = new Client({
    checkUpdate: false,
    autoRedeemNitro: false,
    // Minimal intents for user automation
    intents: ['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES'],
    patchVoice: false
});

client.on('ready', async () => {
    console.log(`Connected as ${client.user.tag}`);
    
    // Load all commands
    commandManager.loadCommands();
    
    // Initialize cloner system
    const cloneCommand = commandManager.commands.get('clone');
    if (cloneCommand && cloneCommand.initialize) {
        await cloneCommand.initialize(client);
        console.log('Cloner system initialized');
    }
    
    // Initialize reaction system
    const reactionCommand = commandManager.commands.get('reaction');
    if (reactionCommand && reactionCommand.initialize) {
        await reactionCommand.initialize(client);
        console.log('Reaction system initialized');
    }
    
    // Set custom status
    try {
        await client.user.setActivity("chatting with friends", {
            type: "CUSTOM",
            state: "💭 chatting with friends"
        });
        console.log('Status set successfully');
    } catch (error) {
        console.error('Error setting status:', error);
    }
});

client.on('messageCreate', async (message) => {
    // Only ignore own messages if they're not commands
    if (message.author.id === client.user.id && 
        !commandManager.startsWithPrefix(message.content.toLowerCase()) && 
        message.content.toLowerCase() !== 'prefix') return;

    // Check if it's a command
    const isCommandOrPrefix = commandManager.startsWithPrefix(message.content.toLowerCase()) || 
                              message.content.toLowerCase() === 'prefix';

    if (isCommandOrPrefix) {
        // Only allowed users can use commands
        if (!commandManager.isAllowedUser(message.author.id)) {
            return;
        }

        // Start typing indicator - skip in stealth mode
        if (!commandManager.isStealthMode()) {
            try {
                await message.channel.sendTyping();
            } catch (error) {
                console.error('Error starting typing:', error);
            }
        }

        // Check if it's a command that was previously handled by Shapes
        const mainPrefix = commandManager.getMainPrefix();
        const shapesCommands = ['reset', 'sleep', 'dashboard', 'info', 'web', 'imagine', 'wack'];
        const commandText = message.content.toLowerCase();
        
        let isShapesCommand = false;
        for (const cmd of shapesCommands) {
            if (commandText.startsWith(`${mainPrefix}${cmd}`)) {
                isShapesCommand = true;
                break;
            }
        }
        
        // In stealth mode, only process essential commands
        if (commandManager.isStealthMode()) {
            // If it's a shapes command, ignore it in stealth mode
            if (isShapesCommand) {
                return;
            }
            
            // For other commands, let the command manager handle them 
            // (it will filter out non-essential commands)
            commandManager.handleCommand(message);
            return;
        }
        
        // Normal mode processing
        if (isShapesCommand) {
            try {
                const response = await shapesAPI.handleCommand(message.content, message.author.id);
                if (response) {
                    // Process response (simplified for Gemini)
                    const processedResponse = processShapesFileUrls(response);
                    await message.reply(processedResponse);
                } else {
                    // If no response from Gemini API, try our command system
                    commandManager.handleCommand(message);
                }
            } catch (error) {
                console.error('Error handling command with Gemini:', error);
            }
            return;
        }

        // Handle our custom commands
        const handled = commandManager.handleCommand(message);
        if (handled) return;
    }

    // If in stealth mode, only process AFK and essential features
    // Allow AFK messages to work even in stealth mode
    const isAFKMention = message.mentions && message.mentions.users && 
                         Array.from(message.mentions.users.keys()).some(id => {
                            return commandManager.config.afkUsers && 
                                  commandManager.config.afkUsers[id];
                         });
    
    if (commandManager.isStealthMode() && !isAFKMention) {
        // If message cloning is active for this channel, that will still work
        // But otherwise ignore all other messages
        return;
    }

    // For regular messages (non-commands), check if user is blocked
    if (commandManager.isUserBlocked(message.author.id)) {
        return;
    }

    // Only process messages in channels where AI is enabled
    if (!commandManager.isAIEnabled(message.channel.id, message.guild?.id)) {
        return;
    }

    // Check if tag is required and message doesn't mention the user
    if (commandManager.isTagRequired(message.channel.id) && 
        !message.mentions.users.has(client.user.id)) {
        return;
    }

    try {
        // Start typing indicator
        await message.channel.sendTyping();
        
        let response;
        
        // Check if message has an image attachment
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                response = await shapesAPI.processImageMessage(
                    message.content || "What's in this image?",
                    attachment.url,
                    message.author.id,
                    message.author.tag // Pass username/tag
                );
            }
        } else {
            // Regular text message
            response = await shapesAPI.generateResponse(
                message.content,
                message.author.id,
                message.author.tag, // Pass username/tag
                message.channel.id
            );
        }

        if (response) {
            // Process response (simplified for Gemini)
            const processedResponse = processShapesFileUrls(response);
            await message.reply(processedResponse);
            // Update stats after successful response
            commandManager.updateStats(message.author.id);
        }
    } catch (error) {
        console.error('Error generating response:', error);
    }
});

// Handle errors gracefully
client.on('error', error => {
    console.error('Client error:', error);
});

client.on('warn', warning => {
    console.warn('Client warning:', warning);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login with user token
client.login(process.env.DISCORD_TOKEN).catch(console.error);