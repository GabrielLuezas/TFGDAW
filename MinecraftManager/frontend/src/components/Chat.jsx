import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Send } from "lucide-react";
import { io } from "socket.io-client";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000");

    socketRef.current.on("chat_message", (data) => {
      setLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: data.player || data.sender || "Unknown",
          text: data.message || JSON.stringify(data),
        },
      ]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newLog = { 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        sender: "Admin", 
        text: message 
    };
    setLogs((prev) => [...prev, newLog]);

    await api.sendCommand(`say ${message}`);
    setMessage("");
  };

  return (
    <div className="h-full flex flex-col p-8">
      <h2 className="text-4xl font-serif text-white text-center mb-8">Chat</h2>

      {/* Chat Box */}
      <div className="flex-1 bg-[#6B7280] rounded-none relative flex flex-col shadow-lg"> {/* Gray Box */}
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="text-white text-lg">
              <span className="font-bold">{log.sender}</span>
              <span className="text-gray-300 text-sm mx-2">{log.time}</span>
              <span>{log.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#4B5563] p-0 flex items-center"> {/* Darker Gray Input Bar */}
          <form onSubmit={handleSend} className="flex-1 flex items-center relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribir en el chat"
              className="w-full bg-[#4B5563] text-white px-6 py-4 text-xl outline-none placeholder-black/50 font-serif"
            />
            <button
              type="submit"
              className="absolute right-4 text-[#31AF7C] hover:text-white transition-colors"
            >
              <Send size={32} fill="#31AF7C" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
