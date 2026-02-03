import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { getLeaderboard } from "@/lib/firestore-access";

const BADGES = {
  1: { icon: Trophy, label: "Gold", color: "text-yellow-500" },
  5: { icon: Award, label: "Silver", color: "text-gray-400" },
  10: { icon: Star, label: "Platinum", color: "text-blue-400" },
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const data = await getLeaderboard();
        setLeaders(data);
      } catch (error) {
        console.error("Error loading leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getBadge = (promptCount: number) => {
    if (promptCount >= 10) return BADGES[10];
    if (promptCount >= 5) return BADGES[5];
    if (promptCount >= 1) return BADGES[1];
    return null;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-32 px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Top Contributors
            </h1>
            <p className="text-muted-foreground text-lg">
              Celebrating our most prolific prompt creators.
            </p>
          </motion.div>

          {/* Leaderboard */}
          {isLoading ? (
            <Card className="bg-black/40 border-white/10">
              <CardContent className="pt-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border border-primary border-t-transparent mx-auto" />
              </CardContent>
            </Card>
          ) : leaders.length === 0 ? (
            <Card className="bg-black/40 border-white/10">
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground">No contributors yet. Be the first!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, idx) => {
                const badge = getBadge(leader.promptCount);
                const isTop3 = idx < 3;

                return (
                  <motion.div
                    key={leader.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`transition-all ${
                        isTop3
                          ? "bg-gradient-to-r from-primary/10 to-transparent border-primary/30 shadow-lg"
                          : "bg-black/40 border-white/10 hover:border-primary/30"
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                          {/* Rank */}
                          <div className="text-3xl font-bold text-muted-foreground min-w-[60px]">
                            {isTop3 && (
                              <span
                                className={`inline-block ${
                                  idx === 0
                                    ? "text-yellow-500"
                                    : idx === 1
                                    ? "text-gray-400"
                                    : "text-amber-600"
                                }`}
                              >
                                {["🥇", "🥈", "🥉"][idx]}
                              </span>
                            )}
                            <span className={!isTop3 ? "text-foreground" : ""}>#{idx + 1}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground">
                              {leader.displayName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {leader.promptCount} approved{" "}
                              {leader.promptCount === 1 ? "prompt" : "prompts"}
                            </p>
                          </div>

                          {/* Badge */}
                          {badge && (
                            <div className="flex flex-col items-center">
                              <badge.icon className={`h-6 w-6 ${badge.color} mb-1`} />
                              <span className="text-xs font-medium text-muted-foreground">
                                {badge.label}
                              </span>
                            </div>
                          )}

                          {/* Count */}
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {leader.promptCount}
                            </p>
                            <p className="text-xs text-muted-foreground">contributions</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Badge Info */}
          <Card className="bg-black/40 border-white/10 mt-12">
            <CardHeader>
              <CardTitle>Achievement Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Trophy className="h-6 w-6 text-yellow-500 mt-1" />
                  <div>
                    <p className="font-semibold">Gold</p>
                    <p className="text-sm text-muted-foreground">1+ approved prompts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-6 w-6 text-gray-400 mt-1" />
                  <div>
                    <p className="font-semibold">Silver</p>
                    <p className="text-sm text-muted-foreground">5+ approved prompts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-blue-400 mt-1" />
                  <div>
                    <p className="font-semibold">Platinum</p>
                    <p className="text-sm text-muted-foreground">10+ approved prompts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
