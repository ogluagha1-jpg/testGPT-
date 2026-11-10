import { router } from "expo-router";
import { useMovieSession } from "./src/MovieSession";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Platform, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Catalog,
  Credentials,
  Stream,
  loadCatalog,
  normalizeServer,
} from "./src/xtream";
import { demoCatalog } from "./src/demo";
import Library from "./src/Library";
import Login from "./src/Login";
import Player from "./src/Player";

const EMPTY: Credentials = { server: "", username: "", password: "" };
const SECRET_KEY = "currentline.connection";
const streamKey = (stream: Stream) => `${stream.kind}:${stream.id}`;

export default function App() {
  const { setSession } = useMovieSession();
  const [form, setForm] = useState<Credentials>(EMPTY);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [demo, setDemo] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playing, setPlaying] = useState<Stream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const favoriteStorage = useRef("");
  const favoriteWrites = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        if (Platform.OS !== "web") {
          const saved = await SecureStore.getItemAsync(SECRET_KEY);
          if (saved && active) {
            const parsed = JSON.parse(saved);
            if (
              typeof parsed.server === "string" &&
              typeof parsed.username === "string" &&
              typeof parsed.password === "string"
            )
              setForm(parsed);
          }
        }
      } catch {
        if (active)
          setError(
            "Saved login could not be read. Please enter your details again.",
          );
      } finally {
        if (active) setRestoring(false);
      }
    };
    void restore();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);

  async function connect() {
    if (!form.username.trim() || !form.password) {
      setError("Enter your username and password.");
      return;
    }
    let next: Credentials;
    try {
      next = {
        ...form,
        username: form.username.trim(),
        server: normalizeServer(form.server),
      };
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await loadCatalog(next, abort.signal);
      if (abort.signal.aborted) return;
      const key = `currentline.favorites:${encodeURIComponent(next.server)}:${encodeURIComponent(next.username)}`;
      let savedFavorites: string[] = [];
      try {
        const saved = JSON.parse((await AsyncStorage.getItem(key)) ?? "[]");
        if (Array.isArray(saved))
          savedFavorites = saved.filter(
            (item): item is string => typeof item === "string",
          );
      } catch {
        /* A damaged favorites cache does not block the catalog. */
      }
      if (abort.signal.aborted) return;
      if (Platform.OS !== "web") {
        try {
          if (remember)
            await SecureStore.setItemAsync(SECRET_KEY, JSON.stringify(next));
          else await SecureStore.deleteItemAsync(SECRET_KEY);
        } catch {
          setError("Connected, but your login could not be saved securely.");
        }
      }
      if (abort.signal.aborted) return;
      favoriteStorage.current = key;
      setFavorites(savedFavorites);
      setCredentials(next);
      setCatalog(result);
      setDemo(false);
      setForm({ ...next, password: "" });
    } catch (e) {
      if (!abort.signal.aborted) setError((e as Error).message);
    } finally {
      if (controller.current === abort) {
        setBusy(false);
        controller.current = null;
      }
    }
  }

  function openDemo() {
    setDemo(true);
    setCatalog(demoCatalog);
    setCredentials(null);
    setFavorites([]);
    setError("");
    favoriteStorage.current = "";
  }
  async function disconnect() {
    try {
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(SECRET_KEY);
    } catch {
      setError(
        "Could not remove the saved login. Please try disconnecting again.",
      );
      return;
    }
    controller.current?.abort();
    setPlaying(null);
    setCatalog(null);
    setCredentials(null);
    setForm(EMPTY);
    setDemo(false);
    setFavorites([]);
    setError("");
    favoriteStorage.current = "";
  }
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);
  const toggleFavorite = useCallback((stream: Stream) => {
    const id = streamKey(stream);
    const current = favoritesRef.current;
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    favoritesRef.current = next;
    setFavorites(next);
    const key = favoriteStorage.current;
    if (key)
      favoriteWrites.current = favoriteWrites.current
        .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
        .catch(() => {
          setError("Could not save favorites on this device.");
        });
  }, []);
  useEffect(() => {
    setSession(
      catalog
        ? { catalog, credentials, demo, favorites, onFavorite: toggleFavorite }
        : null,
    );
  }, [catalog, credentials, demo, favorites, toggleFavorite, setSession]);
  function play(stream: Stream) {
    if (stream.kind === "movie") {
      router.push({ pathname: "/movie", params: { id: stream.id } });
      return;
    }
    setPlaying(stream);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="light" />
        {!catalog ? (
          <Login
            form={form}
            setForm={setForm}
            remember={remember}
            setRemember={setRemember}
            busy={busy}
            restoring={restoring}
            error={error}
            onConnect={() => void connect()}
            onDemo={openDemo}
            onCancel={() => {
              controller.current?.abort();
              setBusy(false);
            }}
          />
        ) : (
          <Library
            catalog={catalog}
            demo={demo}
            favorites={favorites}
            error={error}
            onPlay={play}
            onFavorite={toggleFavorite}
            onDisconnect={() => void disconnect()}
          />
        )}
        <Modal
          visible={!!playing}
          animationType="slide"
          onRequestClose={() => setPlaying(null)}
          supportedOrientations={["portrait", "landscape"]}
        >
          {playing && catalog && (
            <Player
              key={streamKey(playing)}
              stream={playing}
              demo={demo}
              catalog={catalog}
              saved={favorites.includes(streamKey(playing))}
              onFavorite={() => toggleFavorite(playing)}
              onSelect={setPlaying}
              credentials={credentials}
              close={() => setPlaying(null)}
            />
          )}
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1218" },
});
