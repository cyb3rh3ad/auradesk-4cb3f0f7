import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Users, Brain, Send, Mic, Video, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: number;
  sender: string;
  content: string;
  avatar: string;
  time: string;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastMessage: string;
}

const contacts: Contact[] = [
  { id: "1", name: "Sarah Chen", avatar: "SC", status: "online", lastMessage: "Sounds great! Let's do it" },
  { id: "2", name: "Alex Rivera", avatar: "AR", status: "online", lastMessage: "The demo is ready" },
  { id: "3", name: "Team Chat", avatar: "TC", status: "online", lastMessage: "Meeting at 3pm" },
];

const initialMessages: Message[] = [
  { id: 1, sender: "Sarah Chen", content: "Hey! Have you tried the new AI features?", avatar: "SC", time: "2:34 PM" },
  { id: 2, sender: "You", content: "Not yet! What can it do?", avatar: "ME", time: "2:35 PM" },
  { id: 3, sender: "Sarah Chen", content: "It can summarize meetings, help with code, and even analyze documents!", avatar: "SC", time: "2:36 PM" },
];

export const AppPreview = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [activeContact, setActiveContact] = useState(contacts[0]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "You",
        content: inputValue,
        avatar: "ME",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          sender: "Sarah Chen",
          content: "That's awesome! AuraDesk makes collaboration so much easier 🚀",
          avatar: "SC",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1000);
  };

  return (
    <div className="relative">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-muted-foreground">See it in action</h3>
      </div>
      
      <motion.div
        className="mx-auto max-w-4xl rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* App Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="ml-4 text-sm font-medium text-muted-foreground">AuraDesk</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-[400px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-border/50 bg-muted/20 flex flex-col">
            <div className="p-3 border-b border-border/50">
              <Input placeholder="Search..." className="h-8 text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    activeContact.id === contact.id ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveContact(contact)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-sm">
                        {contact.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                      contact.status === "online" ? "bg-green-500" : contact.status === "away" ? "bg-yellow-500" : "bg-gray-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xs">
                  {activeContact.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{activeContact.name}</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.sender === "You" ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs ${
                      message.sender === "You" 
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                        : "bg-gradient-to-br from-violet-500 to-blue-500 text-white"
                    }`}>
                      {message.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${message.sender === "You" ? "text-right" : ""}`}>
                    <div className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                      message.sender === "You"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      {message.content}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{message.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
