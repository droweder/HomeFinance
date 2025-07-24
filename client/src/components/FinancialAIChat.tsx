import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { callChatModel } from "../lib/api";

export default function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const { settings } = useSettings();

  // Recupera o modelo selecionado (ex: "gpt-4", "llama3", etc.)
  function getModeloSelecionado() {
    return localStorage.getItem("modeloSelecionado") || "gpt-4"; // valor padrão
  }

  // Scroll automático para última mensagem
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const modelo = getModeloSelecionado();
      const response = await callChatModel({
        model: modelo,
        messages: updatedMessages,
        temperature: settings.temperature,
      });

      if (!response || !response.choices || !response.choices[0]?.message?.content) {
        throw new Error("Resposta vazia do modelo.");
      }

      const botMessage = response.choices[0].message;
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Erro ao chamar modelo:", err);
      setError("Erro ao obter resposta do modelo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      <div className="border p-4 rounded-md h-[60vh] overflow-y-auto bg-white shadow">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center">Comece a conversa...</div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-lg text-sm max-w-xs ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef}></div>
      </div>

      {error && (
        <div className="text-red-600 mt-2 text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" /> {error}
        </div>
      )}

      <div className="flex mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send />}
        </button>
      </div>
    </div>
  );
}
