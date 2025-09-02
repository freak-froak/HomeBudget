import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bot, Send, User, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  type?: "advice" | "insight" | "warning";
}

interface AIAssistantProps {
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function AIAssistant({ className, isExpanded, onToggleExpand }: AIAssistantProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your AI financial assistant. I can help you analyze your spending patterns, provide budget advice, and answer questions about your finances. What would you like to know?",
      role: "assistant",
      timestamp: new Date(),
      type: "advice"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const financialAdviceMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/ai/financial-advice", { question });
      return response.json();
    },
    onSuccess: (advice) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: advice.advice,
        role: "assistant",
        timestamp: new Date(),
        type: advice.riskLevel === "high" ? "warning" : "advice"
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Add recommendations as separate messages
      if (advice.recommendations && advice.recommendations.length > 0) {
        const recommendationsMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Here are my recommendations:\n${advice.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}`,
          role: "assistant",
          timestamp: new Date(),
          type: "insight"
        };
        
        setMessages(prev => [...prev, recommendationsMessage]);
      }
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        role: "assistant",
        timestamp: new Date(),
        type: "warning"
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || financialAdviceMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    financialAdviceMutation.mutate(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case "insight":
        return <Lightbulb className="w-4 h-4 text-accent" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "advice":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <Bot className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card 
      className={cn(
        "glass-card widget-hover border border-border",
        className
      )}
      data-testid="ai-assistant"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-accent to-primary rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Financial Assistant</CardTitle>
              <p className="text-sm text-muted-foreground">Get personalized insights and advice</p>
            </div>
          </div>
          {onToggleExpand && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleExpand}
              data-testid="button-expand-ai"
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea 
          className={cn(
            "border border-border rounded-lg",
            isExpanded ? "h-96" : "h-48"
          )}
          ref={scrollAreaRef}
          data-testid="scroll-messages"
        >
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  message.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
                )}
                data-testid={`message-${message.id}`}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback 
                    className={cn(
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      getMessageIcon(message.type)
                    )}
                  </AvatarFallback>
                </Avatar>
                
                <div 
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {financialAdviceMutation.isPending && (
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex space-x-2">
          <Input
            placeholder={t("ai.askQuestion")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={financialAdviceMutation.isPending}
            className="flex-1"
            data-testid="input-ai-message"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || financialAdviceMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Questions */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-2">
            {[
              "How can I save more money?",
              "Analyze my spending patterns",
              "Budget recommendations"
            ].map((question) => (
              <Button
                key={question}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue(question);
                  const userMessage: Message = {
                    id: Date.now().toString(),
                    content: question,
                    role: "user",
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, userMessage]);
                  financialAdviceMutation.mutate(question);
                }}
                disabled={financialAdviceMutation.isPending}
                className="text-xs"
                data-testid={`button-quick-question-${question.split(" ")[0].toLowerCase()}`}
              >
                {question}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
