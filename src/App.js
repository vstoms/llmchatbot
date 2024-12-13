import React, { useState, useRef, useEffect } from 'react';
import { Groq } from 'groq-sdk';
import { ShieldCheckIcon, PaperAirplaneIcon, TrashIcon, ComputerDesktopIcon, CloudIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = {
  GROQ: {
    id: 'groq',
    name: 'Groq Cloud',
    icon: CloudIcon,
  },
  LOCAL: {
    id: 'local',
    name: 'Local LM',
    icon: ComputerDesktopIcon,
  },
  GEMINI: {
    id: 'gemini',
    name: 'Gemini 2.0 Flash',
    icon: CloudIcon,
  }
};

const GROQ_MODELS = {
  'llama-3.1-70b-versatile': {
    name: 'LLaMA 3.1 70B Versatile',
    description: 'General purpose model with broad capabilities',
    contextWindow: 4096
  },
  'llama3-groq-70b-8192-tool-use-preview': {
    name: 'LLaMA 3 70B Tool Use',
    description: 'Optimized for tool use and function calling',
    contextWindow: 8192
  },
  'gemma2-9b-it': {
    name: 'Gemma 2 9B',
    description: 'Efficient and lightweight model',
    contextWindow: 8192
  },
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B',
    description: 'High performance with extended context window',
    contextWindow: 32768
  },
  'llama3-70b-8192': {
    name: 'LLaMA 3 70B',
    description: 'Latest LLaMA 3 with extended context',
    contextWindow: 8192
  }
};

const THEMES = {
  DARK: {
    id: 'dark',
    background: '#1C1C1C',
    secondary: '#252525',
    accent: '#2A9D8F',
    text: 'white'
  },
  CYBERPUNK: {
    id: 'cyberpunk',
    background: '#0D0221',
    secondary: '#180F3D',
    accent: '#7209B7',
    text: '#F72585'
  },
  MATRIX: {
    id: 'matrix',
    background: '#000000',
    secondary: '#0D1B0E',
    accent: '#00FF41',
    text: '#00FF41'
  },
  OCEAN: {
    id: 'ocean',
    background: '#1A374D',
    secondary: '#406882',
    accent: '#6998AB',
    text: '#B1D0E0'
  }
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [modalInput, setModalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS.GROQ.id);
  const [selectedGroqModel, setSelectedGroqModel] = useState('llama-3.1-70b-versatile');
  const [selectedTheme, setSelectedTheme] = useState(THEMES.DARK.id);
  const [fontSize, setFontSize] = useState(15);
  const [temperature, setTemperature] = useState(1);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [systemMessage, setSystemMessage] = useState(
    "You are a highly knowledgeable cybersecurity expert. Provide accurate, up-to-date information about cybersecurity topics, best practices, threat detection, and security measures. Focus on practical, actionable advice while maintaining technical accuracy. If you're unsure about something, acknowledge it and suggest reliable sources for further information."
  );
  const messagesEndRef = useRef(null);

  const currentTheme = Object.values(THEMES).find(theme => theme.id === selectedTheme);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processMessageWithGroq = async (messages, userMessage) => {
    try {
      const groq = new Groq({
        apiKey: process.env.REACT_APP_GROQ_API_KEY,
        dangerouslyAllowBrowser: true
      });

      const cleanMessages = messages.map(({ role, content }) => ({ role, content }));
      const cleanUserMessage = { role: userMessage.role, content: userMessage.content };

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          ...cleanMessages,
          cleanUserMessage
        ],
        model: selectedGroqModel,
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      });

      return chatCompletion.choices[0]?.message?.content;
    } catch (error) {
      if (error.message.includes('rate limit exceeded')) {
        return "⚠️ Rate limit exceeded for this model. Please try again in about an hour, or switch to a different model in the settings.";
      }
      throw error;
    }
  };

  const processMessageWithLocal = async (messages, userMessage) => {
    try {
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemMessage
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: userMessage.role,
              content: userMessage.content
            }
          ],
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stream: false,
          stop: ["\n"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
      }

      const data = await response.json();
      console.log('LM Studio response:', data);
      
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Unexpected API response:', data);
        throw new Error('Invalid response format from local LM');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Local LM Error:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Failed to connect to LM Studio. Make sure it is running on port 1234 and a model is loaded.');
      }
      throw new Error(`Local LM Error: ${error.message}`);
    }
  };

  const processMessageWithGemini = async (messages, userMessage) => {
    try {
      // Format messages including history
      const contents = [
        // Add system message if it exists
        ...(systemMessage ? [{
          role: "user",
          parts: [{ text: systemMessage }]
        }] : []),
        // Add conversation history
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        // Add current message
        {
          role: "user",
          parts: [{ text: userMessage.content }]
        }
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: temperature,
              topK: 40,
              topP: parseFloat(topP),
              maxOutputTokens: 8192,  // Maximum allowed by the API
              responseMimeType: "text/plain"
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
      }

      const data = await response.json();
      console.log('Full Gemini API response:', JSON.stringify(data, null, 2));
      
      if (!data.candidates || !data.candidates[0]) {
        console.error('No candidates in response:', data);
        throw new Error('No response candidates from Gemini');
      }

      if (!data.candidates[0].content) {
        console.error('No content in first candidate:', data.candidates[0]);
        throw new Error('No content in Gemini response');
      }

      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('No parts in content:', data.candidates[0].content);
        throw new Error('No parts in Gemini response content');
      }

      if (!data.candidates[0].content.parts[0].text) {
        console.error('No text in first part:', data.candidates[0].content.parts[0]);
        throw new Error('No text in Gemini response part');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log('Extracted response text:', responseText);
      return responseText;
    } catch (error) {
      console.error('Gemini Error:', error);
      throw new Error(`Gemini Error: ${error.message}`);
    }
  };

  const handleSubmit = async (e, message = input) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: message,
      model: selectedModel
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let responseContent;
      if (selectedModel === MODELS.GROQ.id) {
        responseContent = await processMessageWithGroq(messages, userMessage);
      } else if (selectedModel === MODELS.LOCAL.id) {
        responseContent = await processMessageWithLocal(messages, userMessage);
      } else if (selectedModel === MODELS.GEMINI.id) {
        responseContent = await processMessageWithGemini(messages, userMessage);
      }

      const assistantMessage = {
        role: 'assistant',
        content: responseContent || "Sorry, I couldn't process that request.",
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Unknown error occurred'}`,
        model: selectedModel
      }]);
    }

    setIsLoading(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalInput.trim()) return;

    setMessages([]); // Clear existing messages
    setShowResetModal(false);
    
    // Process the new thread's first message
    const userMessage = { role: 'user', content: modalInput };
    setMessages([userMessage]);
    setModalInput('');
    setIsLoading(true);

    try {
      const response = selectedModel === MODELS.GROQ.id
        ? await processMessageWithGroq([], userMessage)
        : selectedModel === MODELS.LOCAL.id
        ? await processMessageWithLocal([], userMessage)
        : await processMessageWithGemini([], userMessage);

      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prevMessages => [...prevMessages, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your message. Please try again.' 
      }]);
    }

    setIsLoading(false);
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setShowResetModal(false);
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    setShowSettingsModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-10 px-4" style={{ backgroundColor: currentTheme.background }}>
      <h1 className="text-6xl font-light mb-12" style={{ color: currentTheme.text }}>What will you discover in Security today?</h1>
      
      <div className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: currentTheme.secondary }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {Object.values(MODELS).map((model) => {
                const Icon = model.icon;
                return (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      selectedModel === model.id
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{ 
                      backgroundColor: selectedModel === model.id ? currentTheme.accent : currentTheme.background
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    {model.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-md text-white hover:bg-opacity-80 transition-colors shadow-sm"
                style={{ backgroundColor: currentTheme.accent }}
              >
                <Cog6ToothIcon className="h-5 w-5" />
                Settings
              </button>
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-md text-white hover:bg-opacity-80 transition-colors shadow-sm"
                style={{ backgroundColor: currentTheme.accent }}
              >
                <TrashIcon className="h-5 w-5" />
                Reset
              </button>
            </div>
          </div>

          {/* Model Info Display */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              {selectedModel === MODELS.GROQ.id ? (
                <>
                  <CloudIcon className="h-5 w-5" style={{ color: currentTheme.accent }} />
                  <span className="text-sm" style={{ color: currentTheme.text }}>
                    {GROQ_MODELS[selectedGroqModel].name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({GROQ_MODELS[selectedGroqModel].contextWindow.toLocaleString()} tokens)
                  </span>
                </>
              ) : selectedModel === MODELS.LOCAL.id ? (
                <>
                  <ComputerDesktopIcon className="h-5 w-5" style={{ color: currentTheme.accent }} />
                  <span className="text-sm" style={{ color: currentTheme.text }}>Local LM Studio</span>
                </>
              ) : (
                <>
                  <CloudIcon className="h-5 w-5" style={{ color: currentTheme.accent }} />
                  <span className="text-sm" style={{ color: currentTheme.text }}>Gemini 2.0 Flash</span>
                </>
              )}
            </div>
          </div>

          {/* Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
              <div className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl border border-gray-700/50" style={{ backgroundColor: currentTheme.secondary }}>
                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  <h2 className="text-xl font-semibold" style={{ color: currentTheme.text }}>Settings</h2>
                  
                  <div className="space-y-4">
                    {selectedModel === MODELS.GROQ.id && (
                      <div>
                        <label className="block mb-2" style={{ color: currentTheme.text }}>Groq Model</label>
                        <select 
                          value={selectedGroqModel}
                          onChange={(e) => setSelectedGroqModel(e.target.value)}
                          className="w-full px-4 py-2 rounded-md bg-black/20 border border-gray-700"
                          style={{ color: currentTheme.text }}
                        >
                          {Object.entries(GROQ_MODELS).map(([id, model]) => (
                            <option key={id} value={id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 text-sm text-gray-400">
                          <p>{GROQ_MODELS[selectedGroqModel].description}</p>
                          <p className="mt-1">Context Window: {GROQ_MODELS[selectedGroqModel].contextWindow.toLocaleString()} tokens</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>AI Personality</label>
                      <textarea
                        value={systemMessage}
                        onChange={(e) => setSystemMessage(e.target.value)}
                        className="w-full px-4 py-2 rounded-md bg-black/20 border border-gray-700 min-h-[100px]"
                        style={{ color: currentTheme.text }}
                        placeholder="Define the AI's role and personality..."
                      />
                      <button
                        type="button"
                        onClick={() => setSystemMessage("You are a highly knowledgeable cybersecurity expert. Provide accurate, up-to-date information about cybersecurity topics, best practices, threat detection, and security measures. Focus on practical, actionable advice while maintaining technical accuracy. If you're unsure about something, acknowledge it and suggest reliable sources for further information.")}
                        className="mt-2 text-sm px-2 py-1 rounded"
                        style={{ color: currentTheme.accent }}
                      >
                        Reset to Default
                      </button>
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Theme</label>
                      <select 
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="w-full px-4 py-2 rounded-md bg-black/20 border border-gray-700"
                        style={{ color: currentTheme.text }}
                      >
                        {Object.values(THEMES).map(theme => (
                          <option key={theme.id} value={theme.id}>
                            {theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Font Size: {fontSize}px</label>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Temperature: {temperature}</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Max Tokens: {maxTokens}</label>
                      <input
                        type="range"
                        min="256"
                        max="4096"
                        step="256"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Top P: {topP}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={topP}
                        onChange={(e) => setTopP(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Frequency Penalty: {frequencyPenalty}</label>
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={frequencyPenalty}
                        onChange={(e) => setFrequencyPenalty(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: currentTheme.text }}>Presence Penalty: {presencePenalty}</label>
                      <input
                        type="range"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={presencePenalty}
                        onChange={(e) => setPresencePenalty(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md text-white hover:bg-opacity-80"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {showResetModal && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
              <div className="bg-[#252525]/90 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl border border-gray-700/50" style={{ backgroundColor: currentTheme.secondary }}>
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold" style={{ color: currentTheme.text }}>New Thread</h2>
                  
                  {/* Chat Input */}
                  <form onSubmit={handleModalSubmit} className="relative">
                    <input
                      type="text"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      placeholder="You ask, we answer..."
                      className="w-full bg-[#1C1C1C] text-gray-200 placeholder-gray-500 rounded-xl py-4 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                      style={{ 
                        backgroundColor: currentTheme.background, 
                        color: currentTheme.text 
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A9D8F] hover:text-[#248F82] disabled:text-gray-600 disabled:hover:text-gray-600"
                      style={{ color: currentTheme.accent }}
                    >
                      <PaperAirplaneIcon className="h-6 w-6" />
                    </button>
                  </form>

                  <div className="h-px bg-gray-700 my-6"></div>
                  
                  <div className="flex justify-between gap-4">
                    <button
                      onClick={() => setShowResetModal(false)}
                      className="px-4 py-2 rounded-md text-gray-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={resetChat}
                      className="flex items-center gap-2 px-6 py-2 rounded-md bg-[#2A9D8F] text-white hover:bg-[#248F82] transition-colors shadow-sm"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      <TrashIcon className="h-5 w-5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Chat Messages */}
          <div className="h-[40rem] overflow-y-auto mb-4 space-y-4" style={{ fontSize: `${fontSize}px` }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-3xl ${
                    message.role === 'assistant'
                      ? 'bg-[#2A9D8F] text-white'
                      : 'bg-[#323232] text-white'
                  } p-5 rounded-2xl shadow-lg`}
                  style={{ 
                    backgroundColor: message.role === 'assistant' ? currentTheme.accent : currentTheme.background, 
                    color: currentTheme.text 
                  }}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      {message.model === MODELS.GROQ.id ? (
                        <CloudIcon className="h-5 w-5 text-white" />
                      ) : message.model === MODELS.LOCAL.id ? (
                        <ComputerDesktopIcon className="h-5 w-5 text-white" />
                      ) : (
                        <CloudIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                  )}
                  <div className={`flex-1 ${message.role === 'assistant' ? 'pl-2' : ''}`}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-lg max-w-none">
                        <ReactMarkdown className="
                          [&>p]:text-[15px] 
                          [&>p]:leading-relaxed 
                          [&>p]:text-white 
                          [&>p]:mb-3 
                          [&>p:last-child]:mb-0 
                          [&>ul]:mt-2 
                          [&>ul]:mb-3 
                          [&>ul>li]:text-[15px] 
                          [&>ul>li]:text-white 
                          [&>code]:text-[15px] 
                          [&>code]:bg-black/20 
                          [&>code]:px-1.5 
                          [&>code]:py-0.5 
                          [&>code]:rounded-md 
                          [&>pre]:bg-black/20 
                          [&>pre]:p-3 
                          [&>pre]:rounded-lg 
                          [&>h1]:text-xl 
                          [&>h2]:text-lg 
                          [&>h3]:text-base 
                          [&>h4]:text-base 
                          [&>p>code]:text-[15px] 
                          [&>p>code]:bg-black/20 
                          [&>p>code]:px-1.5 
                          [&>p>code]:py-0.5 
                          [&>p>code]:rounded-md
                          [&>p>strong]:text-white
                          [&>p>strong]:font-semibold
                          [&>p>em]:text-white
                          [&>p>em]:italic
                          [&>ol]:mt-2
                          [&>ol]:mb-3
                          [&>ol>li]:text-[15px]
                          [&>ol>li]:text-white
                          [&>ol>li>strong]:text-white
                          [&>ol>li>strong]:font-semibold
                          [&>ol>li>em]:text-white
                          [&>ol>li>em]:italic
                          [&>ul>li>strong]:text-white
                          [&>ul>li>strong]:font-semibold
                          [&>ul>li>em]:text-white
                          [&>ul>li>em]:italic
                        ">
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-[15px] leading-relaxed text-white">{message.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#2A9D8F] text-white p-5 rounded-2xl flex items-center space-x-3 shadow-lg" style={{ backgroundColor: currentTheme.accent }}>
                  <div className="flex-shrink-0">
                    {selectedModel === MODELS.GROQ.id ? (
                      <CloudIcon className="h-5 w-5 text-white animate-pulse" />
                    ) : selectedModel === MODELS.LOCAL.id ? (
                      <ComputerDesktopIcon className="h-5 w-5 text-white animate-pulse" />
                    ) : (
                      <CloudIcon className="h-5 w-5 text-white animate-pulse" />
                    )}
                  </div>
                  <div className="pl-2 text-[15px] text-white/95">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-2 mb-4 text-sm"
            style={{ color: currentTheme.text }}
          >
            <span className={`transform transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}>
              ▶
            </span>
            Advanced Model Settings
          </button>

          {showAdvancedSettings && (
            <div className="space-y-4 mb-6 pl-4 border-l-2" style={{ borderColor: currentTheme.accent }}>
              <div>
                <div className="flex justify-between">
                  <label className="block mb-2" style={{ color: currentTheme.text }}>
                    Temperature: {temperature}
                  </label>
                  <button
                    type="button"
                    onClick={() => setTemperature(1)}
                    className="text-sm px-2 rounded"
                    style={{ color: currentTheme.accent }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm mt-1 text-gray-400">
                  Controls randomness: Lower values are more focused, higher values more creative
                </p>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block mb-2" style={{ color: currentTheme.text }}>
                    Max Tokens: {maxTokens}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMaxTokens(1024)}
                    className="text-sm px-2 rounded"
                    style={{ color: currentTheme.accent }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm mt-1 text-gray-400">
                  Maximum length of the response
                </p>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block mb-2" style={{ color: currentTheme.text }}>
                    Top P: {topP}
                  </label>
                  <button
                    type="button"
                    onClick={() => setTopP(1)}
                    className="text-sm px-2 rounded"
                    style={{ color: currentTheme.accent }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm mt-1 text-gray-400">
                  Controls diversity: Lower values are more focused
                </p>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block mb-2" style={{ color: currentTheme.text }}>
                    Frequency Penalty: {frequencyPenalty}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFrequencyPenalty(0)}
                    className="text-sm px-2 rounded"
                    style={{ color: currentTheme.accent }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={frequencyPenalty}
                  onChange={(e) => setFrequencyPenalty(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm mt-1 text-gray-400">
                  Controls repetition: Higher values discourage repetition
                </p>
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block mb-2" style={{ color: currentTheme.text }}>
                    Presence Penalty: {presencePenalty}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPresencePenalty(0)}
                    className="text-sm px-2 rounded"
                    style={{ color: currentTheme.accent }}
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={presencePenalty}
                  onChange={(e) => setPresencePenalty(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm mt-1 text-gray-400">
                  Controls presence: Higher values encourage presence
                </p>
              </div>
            </div>
          )}
          {/* Chat Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="You ask, we answer..."
              className="w-full bg-[#1C1C1C] text-gray-200 placeholder-gray-500 rounded-xl py-4 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]"
              style={{ 
                backgroundColor: currentTheme.background, 
                color: currentTheme.text 
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A9D8F] hover:text-[#248F82] disabled:text-gray-600 disabled:hover:text-gray-600"
              style={{ color: currentTheme.accent }}
            >
              <PaperAirplaneIcon className="h-6 w-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
