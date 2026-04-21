import ChatInterface from "@/components/chat/chat-interface";
import { HelpButton } from "@/components/app-shell/help-button";

export default function ChatPage() {
  return (
    <div className="-mx-6 -my-8 lg:-mx-10 h-[calc(100vh-0px)] relative">
      <div className="absolute top-4 right-4 z-10">
        <HelpButton helpKey="chat" />
      </div>
      <ChatInterface />
    </div>
  );
}
