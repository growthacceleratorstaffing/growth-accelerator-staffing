import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const PlatformChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Show and auto-open chatbot after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsOpen(true); // Auto-open the chat interface
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hi there! 👋 Ask me anything about our platform - I can help with job postings, candidate management, navigation, and more!',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const conversation = messages.map(({ role, content }) => ({ role, content }));
      
      const { data, error } = await supabase.functions.invoke('platform-chatbot', {
        body: { 
          message: inputMessage,
          conversation 
        }
      });

      if (error) {
        console.error('Chatbot error:', error);
        throw new Error('Failed to get response from chatbot');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from chatbot. Please try again.",
        variant: "destructive"
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg animate-pulse"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <Card className="w-80 h-96 shadow-xl border animate-scale-in bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-secondary text-white">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4" />
              Ask me anything...
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-64 mb-3">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <User className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlatformChatbot;