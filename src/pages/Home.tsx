import { motion } from "framer-motion";
import { Search, ArrowRight, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import TubesEffect from "@/components/TubesEffect";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import { AVAILABLE_MODELS } from "@/lib/models";
import { useChat } from "@/contexts/ChatContext";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  const { loadModelById, openChat } = useChat();

  const handleModelClick = (id: string) => {
    loadModelById(id);
    openChat();
  };

  return (
    <div className="min-h-screen relative selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Full Hero Background Image */}
      <div 
        className="fixed inset-0 z-0 w-full h-screen"
        style={{
          backgroundImage: "url(/dunamis-hero.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
      </div>

      {/* Mouse Trail Canvas */}
      <TubesEffect />

      {/* Content Layer */}
      <div className="relative z-20">
        {/* Hero Header Section - Full Screen Height */}
        <header className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="font-display text-7xl md:text-9xl font-light text-white drop-shadow-2xl tracking-widest leading-tight">
              DUNAMIS
            </h1>
            
            <div className="space-y-6">
              <p className="text-2xl md:text-3xl text-yellow-300 drop-shadow-lg italic font-light">
                "In-browser AI — private, fast, and offline-capable"
              </p>
              
              <p className="text-base md:text-lg text-gray-100 drop-shadow-md leading-relaxed">
                Run powerful language models directly in your browser.<br/>
                No servers, no data collection, no compromises.
              </p>
              
              <div className="pt-6 border-t border-white/30">
                <p className="text-sm md:text-base text-yellow-400 drop-shadow-md font-semibold tracking-widest uppercase">
                  Community-Driven Prompt Engineering
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Sections */}
        <main className="w-full max-w-5xl mx-auto px-4 space-y-16 pb-20 bg-gradient-to-b from-black/80 to-black">
          <section className="pt-12">
            <h2 className="text-3xl font-semibold text-white drop-shadow-md mb-6 text-center">Select Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModelClick(m.id)}
                  className="text-left p-6 rounded-lg bg-black/60 backdrop-blur border border-yellow-500/30 hover:border-yellow-400 hover:bg-black/70 transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg text-white">{m.name}</div>
                      <div className="text-sm text-gray-300">{m.description}</div>
                    </div>
                    <div className="text-xs text-yellow-400 font-bold">{m.vram}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold text-white drop-shadow-md mb-6 text-center">Chat</h2>
            <div className="bg-black/60 backdrop-blur rounded-lg p-6 border border-yellow-500/30 shadow-lg">
              <ChatWidget />
            </div>
          </section>

          <section>
            <div className="bg-black/60 backdrop-blur rounded-lg p-6 border border-yellow-500/30 shadow-lg">
              <ContactSection />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

