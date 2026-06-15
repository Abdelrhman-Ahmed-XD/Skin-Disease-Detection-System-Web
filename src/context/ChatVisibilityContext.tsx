import React, { createContext, useContext, useState } from 'react';

interface ChatVisibilityContextType {
  chatHidden: boolean;
  setChatHidden: (v: boolean) => void;
}

const ChatVisibilityContext = createContext<ChatVisibilityContextType>({
  chatHidden: false,
  setChatHidden: () => {},
});

export const ChatVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatHidden, setChatHidden] = useState(false);
  return (
    <ChatVisibilityContext.Provider value={{ chatHidden, setChatHidden }}>
      {children}
    </ChatVisibilityContext.Provider>
  );
};

export const useChatVisibility = () => useContext(ChatVisibilityContext);
