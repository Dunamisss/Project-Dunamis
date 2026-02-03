import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Send, Maximize2, Minimize2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { prompts } from "@/data/prompts";
import type { Prompt } from "@/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import TubesEffect from "@/components/TubesEffect";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBot() {
  const [, params] = useRoute("/chatbot/:id");
  const [, navigate] = useLocation();
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [promptInjected, setPromptInjected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const promptId = params?.id as string;

  // Load the prompt
  useEffect(() => {
    if (promptId) {
      const foundPrompt = prompts.find(p => p.id === promptId);
      if (foundPrompt) {
        setPrompt(foundPrompt);
      } else {
        navigate("/");
      }
    }
  }, [promptId, navigate]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle message send
  const handleSendMessage = async () => {
    if (!input.trim() || !prompt) return;

    const userMessage: Message = {
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Inject prompt on first message if not already injected
    let systemPrompt = prompt.content;
    if (!promptInjected) {
      setPromptInjected(true);
    }

    try {
      // Simulate API call - replace with actual API endpoint
      // This would typically call your backend which uses OpenAI or similar
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: prompt.id,
          messages: [...messages, userMessage],
          import React from "react";

          // Removed page; stub to keep imports safe.
          export default function ChatBot() {
            return null;
          }
      }
