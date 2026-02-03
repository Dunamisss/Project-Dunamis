import { motion } from "framer-motion";
import { Trophy, Star, Shield, Zap, BookOpen, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CommunityGuide() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Link href="/profile">
            <Button variant="ghost" className="mb-8 pl-0 hover:pl-2 transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
            </Button>
          </Link>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-12"
          >
            {/* Header */}
            <motion.div variants={item} className="text-center space-y-4">
              <Badge variant="outline" className="border-primary/50 text-primary mb-2">Community Handbook</Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                Rise to the Top
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The Dunamis Leaderboard rewards quality, consistency, and community impact. 
                Learn how to earn reputation and unlock exclusive ranks.
              </p>
            </motion.div>

            {/* Point System Grid */}
            <motion.div variants={item} className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <Zap className="h-8 w-8 text-yellow-400 mb-2" />
                  <CardTitle>Action Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span>Submit a Prompt</span>
                    <span className="font-bold text-foreground">+50 pts</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span>Prompt Approved</span>
                    <span className="font-bold text-foreground">+100 pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Get a Like/Save</span>
                    <span className="font-bold text-foreground">+10 pts</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <Shield className="h-8 w-8 text-blue-400 mb-2" />
                  <CardTitle>Ranks & Badges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="flex items-center gap-2"><Badge variant="outline">Contributor</Badge></span>
                    <span>0+ pts</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="flex items-center gap-2"><Badge className="bg-blue-500/20 text-blue-400">Expert</Badge></span>
                    <span>1,000+ pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2"><Badge className="bg-yellow-500/20 text-yellow-400">Grandmaster</Badge></span>
                    <span>5,000+ pts</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <Star className="h-8 w-8 text-purple-400 mb-2" />
                  <CardTitle>Perks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <ul className="list-disc list-inside space-y-2">
                    <li>Profile Badge display</li>
                    <li>Priority moderation queue</li>
                    <li>Access to beta features</li>
                    <li>Direct access to Dunamis team</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quality Guidelines */}
            <motion.div variants={item} className="bg-primary/5 border border-primary/10 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Quality Standards</h3>
                  <p className="text-muted-foreground mb-4">
                    To ensure the integrity of the library, all submissions are reviewed by our team. 
                    Approved prompts typically meet these criteria:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Do's</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Include clear variables [like this]</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Provide specific context/role</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Test before submitting</li>
                      </ul>
                  return null;
                    <div className="space-y-2">
