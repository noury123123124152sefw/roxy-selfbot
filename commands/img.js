const shapesAPI = require('../shapes.js');

// Import the URL processing function
function processShapesFileUrls(message) {
    if (!message) return message;
    
    // Since we're no longer using Shapes, we don't need to process Shapes URLs
    // But we'll keep this function for compatibility
    return message;
}

module.exports = {
    name: 'img',
    description: 'Generate an image response using Gemini API',
    category: 'AI',
    async execute(message, args, commandManager) {
        // Only process for allowed users
        if (!commandManager.isAllowedUser(message.author.id)) {
            return;
        }

        // Check if text is provided
        if (args.length < 1) {
            return message.reply('Please provide some text for the image generation. Usage: `!img <text>`');
        }

        try {
            // Get the full text by joining all arguments
            const text = args.join(' ');
            
            // Create the full command text as it would be sent to the AI
            const fullCommand = `!img ${text}`;
            
            // Send initial response to show we're processing
            const processingMsg = await message.reply('🎨 Generating image response...');
            
            try {
                // Use the updated Gemini API instance to handle the command
                const response = await shapesAPI.generateResponse(fullCommand, message.author.id, message.author.tag, message.channel.id);
                
                // Process the response (no URL processing needed for Gemini)
                const processedResponse = processShapesFileUrls(response);
                
                // Update the message with the processed API response
                await processingMsg.edit(processedResponse || 'No response from Gemini API');
            } catch (error) {
                console.error('Error calling Gemini API:', error);
                await processingMsg.edit('Sorry, there was an error generating the image response. Please try again later.');
            }
        } catch (error) {
            console.error('Error in img command:', error);
            message.reply('There was an error processing your request. Please try again later.');
        }
    }
};