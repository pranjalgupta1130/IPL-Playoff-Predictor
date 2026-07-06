"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCard } from "@/components/fixtures/MatchCard";
import { useSimulatorStore } from "@/store/simulatorStore";

export default function FixturesPage() {
  const { upcomingMatches, completedMatches, loading } = useSimulatorStore();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Fixtures</h1>
        <p className="mt-2 text-muted-foreground">
          Completed results are locked. Upcoming matches can be simulated on the Simulator page.
        </p>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading fixtures...</p>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingMatches.map((match) => (
                <MatchCard key={match._id} match={match} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {completedMatches.map((match) => (
                <MatchCard key={match._id} match={match} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
