import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import {
  Catalog,
  Credentials,
  Stream,
  loadCatalog,
  normalizeServer,
  playbackUrl,
} from "./src/xtream";
import { demoCatalog } from "./src/demo";
import Library from "./src/Library";

const EMPTY: Credentials = { server: "", username: "", password: "" };
const SECRET_KEY = "currentline.connection";
const streamKey = (stream: Stream) => `${stream.kind}:${stream.id}`;

function Player({
  stream,
  credentials,
  close,
}: {
  stream: Stream;
  credentials: Credentials;
  close: () => void;
}) {
  const player = useVideoPlayer(
    {
      uri: playbackUrl(credentials, stream),
      contentType: stream.kind === "live" ? "hls" : "auto",
    },
    (instance) => instance.play(),
  );
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  return (
    <SafeAreaView style={s.playerScreen}>
      <View style={s.playerHeader}>
        <View style={s.flex}>
          <Text style={s.eyebrow}>
            {stream.kind === "live" ? "LIVE CHANNEL" : "NOW PLAYING"}
          </Text>
          <Text style={s.title}>{stream.name}</Text>
        </View>
        <Pressable
          accessibilityLabel="Close player"
          onPress={close}
          style={s.iconButton}
        >
          <Text style={s.icon}>×</Text>
        </Pressable>
      </View>
      <VideoView
        player={player}
        style={s.video}
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
      />
      {(status === "loading" || status === "idle") && (
        <View style={s.playerMessage}>
          <ActivityIndicator color={C.accent} />
          <Text style={s.muted}>Opening stream…</Text>
        </View>
      )}
      {status === "error" && (
        <View style={s.playerMessage}>
          <Text style={s.error}>
            This stream could not be played. It may be offline or use a format
            your device does not support.
          </Text>
          <Pressable
            style={s.button}
            onPress={() => {
              void player
                .replaceAsync({
                  uri: playbackUrl(credentials, stream),
                  contentType: stream.kind === "live" ? "hls" : "auto",
                })
                .then(() => player.play())
                .catch(() => {});
            }}
          >
            <Text style={s.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}
      <Text style={s.playerHint}>
        Use the player controls for volume, seeking, and fullscreen.
      </Text>
    </SafeAreaView>
  );
}

export default function App() {
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
  const [showPassword, setShowPassword] = useState(false);
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
  function toggleFavorite(stream: Stream) {
    const id = streamKey(stream);
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id];
    setFavorites(next);
    const key = favoriteStorage.current;
    if (key)
      favoriteWrites.current = favoriteWrites.current
        .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
        .catch(() => {
          setError("Could not save favorites on this device.");
        });
  }
  function play(stream: Stream) {
    if (demo) {
      Alert.alert(
        "Demo catalog",
        "These titles demonstrate the interface. Connect your Xtream server to play your channels and movies.",
      );
      return;
    }
    setPlaying(stream);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="light" />
        {!catalog ? (
          <ScrollView
            contentContainerStyle={s.login}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.brandRow}>
              <View style={s.logo}>
                <Text style={s.logoText}>▶</Text>
              </View>
              <Text style={s.brand}>
                currentline<Text style={s.brandDot}>.</Text>
              </Text>
            </View>
            <View style={s.loginHero}>
              <Text style={s.eyebrow}>YOUR CHANNELS. YOUR CINEMA.</Text>
              <Text style={s.heroTitle}>A better way{"\n"}to press play.</Text>
              <Text style={s.heroDescription}>
                Live television and movie nights, together in one place.
              </Text>
              <View style={s.featureRow}>
                <Text style={s.feature}>● LIVE TV</Text>
                <Text style={s.feature}>▰ MOVIES</Text>
                <Text style={s.feature}>♡ FAVORITES</Text>
              </View>
            </View>
            <View style={s.loginCard}>
              <Text style={s.title}>Connect your playlist</Text>
              <Text style={s.muted}>
                Use the Xtream login supplied by your provider.
              </Text>
              <Text style={s.label}>SERVER ADDRESS</Text>
              <TextInput
                accessibilityLabel="Server address"
                style={s.input}
                placeholder="https://your-server.com:8080"
                placeholderTextColor={C.dim}
                value={form.server}
                onChangeText={(server) => setForm({ ...form, server })}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!busy && !restoring}
              />
              <Text style={s.label}>USERNAME</Text>
              <TextInput
                accessibilityLabel="Username"
                style={s.input}
                placeholder="Your username"
                placeholderTextColor={C.dim}
                value={form.username}
                onChangeText={(username) => setForm({ ...form, username })}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                editable={!busy && !restoring}
              />
              <Text style={s.label}>PASSWORD</Text>
              <View style={s.passwordRow}>
                <TextInput
                  accessibilityLabel="Password"
                  style={[s.input, s.password]}
                  placeholder="Your password"
                  placeholderTextColor={C.dim}
                  value={form.password}
                  onChangeText={(password) => setForm({ ...form, password })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  editable={!busy && !restoring}
                />
                <Pressable
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.showPassword}
                >
                  <Text style={s.link}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
              {Platform.OS !== "web" && (
                <View style={s.remember}>
                  <Text style={s.muted}>Remember login securely</Text>
                  <Switch
                    accessibilityLabel="Remember login securely"
                    value={remember}
                    onValueChange={setRemember}
                    disabled={busy}
                    trackColor={{ true: C.accent, false: C.border }}
                    thumbColor="#ffffff"
                  />
                </View>
              )}
              {form.server.trim().startsWith("http:") && (
                <Text style={s.warning}>
                  HTTP sends your login and streams without encryption. Use
                  HTTPS when your provider supports it.
                </Text>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={busy || restoring}
                onPress={() => void connect()}
                style={[s.button, (busy || restoring) && s.disabled]}
              >
                {busy || restoring ? (
                  <ActivityIndicator color={C.bg} />
                ) : (
                  <Text style={s.buttonText}>Connect & explore →</Text>
                )}
              </Pressable>
              {busy && (
                <Pressable
                  style={s.demoButton}
                  onPress={() => {
                    controller.current?.abort();
                    setBusy(false);
                  }}
                >
                  <Text style={s.link}>Cancel connection</Text>
                </Pressable>
              )}
            </View>
            <Pressable
              disabled={busy || restoring}
              onPress={openDemo}
              style={s.demoButton}
            >
              <Text style={s.demoText}>
                Take a look around <Text style={s.link}>with demo mode →</Text>
              </Text>
            </Pressable>
            <Text style={s.footnote}>
              Bring your own playlist. No channels or movies are included.
            </Text>
          </ScrollView>
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
          {playing && credentials && (
            <Player
              stream={playing}
              credentials={credentials}
              close={() => setPlaying(null)}
            />
          )}
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const C = {
  bg: "#0b1218",
  panel: "#131e27",
  border: "#25333d",
  accent: "#76e0c1",
  text: "#f3f5f4",
  muted: "#9daeb9",
  dim: "#6b808f",
};
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  login: {
    padding: 24,
    paddingTop: 30,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 38,
    height: 38,
    backgroundColor: C.accent,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: C.bg, fontSize: 16, fontWeight: "900" },
  brand: { color: C.text, fontSize: 23, fontWeight: "800", letterSpacing: -1 },
  brandDot: { color: C.accent },
  loginHero: { paddingVertical: 38 },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 43,
    lineHeight: 49,
    letterSpacing: -1.7,
    fontWeight: "800",
    color: C.text,
  },
  heroDescription: {
    color: C.muted,
    lineHeight: 23,
    fontSize: 15,
    marginTop: 15,
    maxWidth: 290,
  },
  featureRow: { flexDirection: "row", gap: 19, marginTop: 24 },
  feature: {
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  loginCard: {
    backgroundColor: C.panel,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 8,
  },
  title: {
    fontSize: 21,
    color: C.text,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  muted: { color: C.muted, fontSize: 12, lineHeight: 19 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: C.muted,
    marginTop: 16,
    marginBottom: 2,
  },
  input: {
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.bg,
    padding: 14,
    fontSize: 14,
    minHeight: 49,
  },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  password: { flex: 1, paddingRight: 63 },
  showPassword: { position: "absolute", right: 0, padding: 15 },
  link: { color: C.accent, fontWeight: "600", fontSize: 12 },
  remember: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  warning: { color: "#e7ba7c", fontSize: 12, lineHeight: 18, marginBottom: 10 },
  error: { color: "#ffaba5", fontSize: 13, lineHeight: 20, marginVertical: 8 },
  button: {
    backgroundColor: C.accent,
    minHeight: 51,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
  },
  buttonText: { fontSize: 14, fontWeight: "800", color: C.bg },
  disabled: { opacity: 0.5 },
  demoButton: { paddingVertical: 22, alignItems: "center" },
  demoText: { color: C.muted, fontSize: 12 },
  footnote: { color: C.dim, fontSize: 11, textAlign: "center", lineHeight: 18 },
  playerScreen: { flex: 1, backgroundColor: C.bg },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 15,
  },
  iconButton: { padding: 12 },
  icon: { color: C.text, fontSize: 30 },
  video: { width: "100%", flex: 1, backgroundColor: "#000" },
  playerMessage: { padding: 24, gap: 12 },
  playerHint: {
    color: C.muted,
    padding: 24,
    fontSize: 12,
    textAlign: "center",
  },
});
