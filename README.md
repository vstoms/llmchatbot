# Groq Chat - Cybersecurity AI Assistant

A modern React-based chat application that leverages both Groq AI and local LM Studio models for cybersecurity-focused conversations.

![Dashboard](/img/chatbot.png)

## Features

- **Dual Model Support**:
  - Groq Cloud API integration
  - Local LM Studio support
  - Visual indicators (cloud/desktop icons) showing which model is responding
  - Easy model switching

- **Modern UI/UX**:
  - Dark theme with teal accents
  - Responsive layout with max-width containers
  - Enhanced text readability with proper contrast
  - Markdown support for rich text responses
  - Smooth scrolling chat window
  - Loading indicators with model-specific icons

- **Chat Features**:
  - Real-time message updates
  - Support for code blocks and formatting
  - Error handling with informative messages
  - New thread creation with reset option
  - Message history within session

## Technical Stack

- **Frontend**:
  - React
  - Tailwind CSS with typography plugin
  - React Markdown for message formatting
  - Heroicons for UI elements

- **APIs**:
  - Groq API with llama-3.1-70b-versatile model
  - Local LM Studio integration

## Configuration

### Environment Variables

Create a `.env.local` file with:
```
REACT_APP_GROQ_API_KEY=your_api_key_here
```

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-markdown": "latest",
    "@heroicons/react": "^2.x",
    "groq-sdk": "latest",
    "@tailwindcss/typography": "latest"
  }
}
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` and add your Groq API key
4. Start the development server:
   ```bash
   npm start
   ```

## Using Local LM Studio

1. Install and start LM Studio
2. Load a model in LM Studio
3. Ensure the server is running on port 1234
4. Click the "Local LM" button in the chat interface to switch to local model

## Styling

The application uses a custom dark theme with:
- Background: #1C1C1C
- Secondary Background: #252525
- Accent Color: #2A9D8F
- Enhanced text contrast for better readability
- Proper spacing and padding for optimal viewing
- Responsive design for all screen sizes

## Advanced Model Controls

### Available Groq Models
- **LLaMA 3.1 70B Versatile** (4K context window)
  - General purpose model with broad capabilities
- **LLaMA 3 70B Tool Use** (8K context window)
  - Optimized for tool use and function calling
- **Gemma 2 9B** (8K context window)
  - Efficient and lightweight model
- **Mixtral 8x7B** (32K context window)
  - High performance with extended context window
- **LLaMA 3 70B** (8K context window)
  - Latest LLaMA 3 with extended context

### Model Parameters
- **Temperature** (0-2)
  - Controls response randomness
  - Lower values: More focused and deterministic
  - Higher values: More creative and diverse
- **Max Tokens** (256-4096)
  - Controls maximum response length
- **Top P** (0-1)
  - Controls diversity via nucleus sampling
- **Frequency Penalty** (-2 to 2)
  - Reduces repetition of frequent tokens
- **Presence Penalty** (-2 to 2)
  - Encourages exploration of new topics

### Error Handling
- Rate limit detection and user-friendly messaging
- Model switching suggestions when limits are reached
- Clear visual feedback for API status

## Theme Customization
- Dark (Default)
- Cyberpunk
- Matrix
- Ocean

Each theme includes:
- Custom background colors
- Accent colors
- Text colors
- Consistent styling across modals and UI elements

## UI Enhancements
- Model info display with context window size
- Collapsible advanced settings panel
- Parameter reset buttons
- Live parameter value display
- Responsive design for all screen sizes
- Improved error messaging
- Visual loading states

## Technical Updates
- Dynamic model switching
- Real-time parameter adjustments
- Theme-aware component styling
- Enhanced error boundary implementation
- Improved state management
- Rate limit handling

## Future Improvements

- Backend API proxy for secure key management
- Conversation history persistence
- Advanced error handling
- User customization options
- Model parameter adjustments
- Chat export functionality

## Notes

- When using local LM Studio, ensure a model is loaded before attempting to chat
- The application will provide clear error messages if there are connection issues
- Messages maintain their original model association regardless of current selection
