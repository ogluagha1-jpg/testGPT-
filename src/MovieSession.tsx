import React, { createContext, useContext, useState } from "react";
import type { Catalog, Credentials, Stream } from "./xtream";
export type MovieSession = {
  catalog: Catalog;
  credentials: Credentials | null;
  demo: boolean;
  favorites: string[];
  onFavorite: (stream: Stream) => void;
};
const Context = createContext<{
  session: MovieSession | null;
  setSession: React.Dispatch<React.SetStateAction<MovieSession | null>>;
} | null>(null);
export function MovieSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<MovieSession | null>(null);
  return (
    <Context.Provider value={{ session, setSession }}>
      {children}
    </Context.Provider>
  );
}
export function useMovieSession() {
  const context = useContext(Context);
  if (!context) throw new Error("MovieSessionProvider is required.");
  return context;
}
