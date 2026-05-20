import { createClient } from "@/lib/supabase/server";
import { createRoom } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const DIFFICULTY_LABEL: Record<string, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

// Lobby — fetches published grids from Supabase and lets the user create a room.
export default async function PlayLobbyPage() {
  const supabase = await createClient();
  const { data: grids } = await supabase
    .from("grids")
    .select("id, title, difficulty, width, height")
    .eq("published", true)
    .order("difficulty");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif mb-2 text-3xl font-semibold">Choisir une grille</h1>
      <p className="text-muted-foreground mb-8 text-base">
        Créez une salle et partagez le lien à vos amis.
      </p>

      {!grids || grids.length === 0 ? (
        <p className="text-muted-foreground">Aucune grille disponible pour l&apos;instant.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {grids.map((grid) => (
            <li key={grid.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{grid.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {DIFFICULTY_LABEL[grid.difficulty] ?? grid.difficulty} —{" "}
                    {grid.width}&times;{grid.height}
                  </p>
                </CardContent>
                <CardFooter>
                  {/* Server Action — create room and redirect */}
                  <form
                    action={async () => {
                      "use server";
                      await createRoom(grid.id);
                    }}
                    className="w-full"
                  >
                    <Button type="submit" className="w-full">
                      Créer une salle
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
