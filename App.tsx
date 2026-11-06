import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  Kind,
  Stream,
  loadCatalog,
  normalizeServer,
  playbackUrl,
} from "./src/xtream";
import { demoCatalog } from "./src/demo";

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
  const [tab, setTab] = useState<Kind | "favorites">("live");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
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
    setQuery("");
    setCategory("");
    setTab("live");
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

  const categories =
    !catalog || tab === "favorites"
      ? []
      : tab === "live"
        ? catalog.liveCategories
        : catalog.movieCategories;
  const all = catalog ? [...catalog.live, ...catalog.movie] : [];
  const items = (
    tab === "favorites"
      ? all.filter((item) => favorites.includes(streamKey(item)))
      : (catalog?.[tab] ?? [])
  ).filter(
    (item) =>
      (!category || item.category === category) &&
      item.name.toLowerCase().includes(query.toLowerCase().trim()),
  );

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
          <View style={s.flex}>
            <View style={s.topbar}>
              <View style={s.brandRow}>
                <View style={s.smallLogo}>
                  <Text style={s.logoText}>▶</Text>
                </View>
                <Text style={s.brand}>
                  currentline<Text style={s.brandDot}>.</Text>
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Disconnect and remove saved login"
                onPress={() => void disconnect()}
                style={s.disconnect}
              >
                <Text style={s.disconnectText}>
                  {demo ? "Exit demo" : "Sign out"}
                </Text>
              </Pressable>
            </View>
            <View style={s.libraryHeader}>
              <Text style={s.eyebrow}>
                {demo ? "DEMO COLLECTION" : "YOUR PERSONAL COLLECTION"}
              </Text>
              <Text style={s.libraryTitle}>
                {tab === "live"
                  ? "On air. Right now."
                  : tab === "movie"
                    ? "Make it a movie night."
                    : "Your front row."}
              </Text>
              <Text style={s.muted}>
                {tab === "live"
                  ? "Find something worth tuning into."
                  : tab === "movie"
                    ? "Settle in. Your next story is waiting."
                    : "The channels and movies you love."}
              </Text>
              <View style={s.searchRow}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  accessibilityLabel="Search titles"
                  style={s.search}
                  placeholder="Search your collection"
                  placeholderTextColor={C.dim}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                />
                <Pressable
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                  style={s.clearSearch}
                >
                  <Text style={s.muted}>{query ? "×" : ""}</Text>
                </Pressable>
              </View>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={[s.error, s.libraryError]}>
                {error}
              </Text>
            )}
            {categories.length > 0 && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chips}
                >
                  {[{ id: "", name: "All categories" }, ...categories].map(
                    (item) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: category === item.id }}
                        key={item.id}
                        onPress={() => setCategory(item.id)}
                        style={[s.chip, category === item.id && s.chipActive]}
                      >
                        <Text
                          style={[
                            s.chipText,
                            category === item.id && s.chipTextActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </ScrollView>
              </View>
            )}
            <View style={s.sectionHeading}>
              <Text style={s.sectionTitle}>
                {tab === "favorites"
                  ? "SAVED FOR YOU"
                  : tab === "live"
                    ? "CHANNEL GUIDE"
                    : "MOVIE LIBRARY"}
              </Text>
              <Text style={s.muted}>{items.length} titles</Text>
            </View>
            <FlatList
              data={items}
              keyExtractor={streamKey}
              contentContainerStyle={s.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <View style={s.streamCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${item.name}`}
                    onPress={() => play(item)}
                    style={s.streamMain}
                  >
                    <View
                      style={[
                        s.artwork,
                        {
                          backgroundColor: [
                            "#173c40",
                            "#34304c",
                            "#423525",
                            "#253c53",
                          ][index % 4],
                        },
                      ]}
                    >
                      <Text style={s.artworkLetter}>
                        {item.name.slice(0, 1).toUpperCase()}
                      </Text>
                      {item.image && (
                        <Image
                          source={{ uri: item.image }}
                          style={s.artworkImage}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                    <View style={s.streamInfo}>
                      <Text style={s.streamName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={s.streamMeta}>
                        {item.kind === "live"
                          ? "● LIVE"
                          : item.extension.toUpperCase()}
                        <Text style={s.dim}>
                          {" "}
                          ·{" "}
                          {demo
                            ? "Demo title"
                            : ((item.kind === "live"
                                ? catalog.liveCategories
                                : catalog.movieCategories
                              ).find((c) => c.id === item.category)?.name ??
                              "Uncategorized")}
                        </Text>
                      </Text>
                    </View>
                    <View style={s.playCircle}>
                      <Text style={s.playIcon}>▶</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${favorites.includes(streamKey(item)) ? "Remove" : "Add"} ${item.name} ${favorites.includes(streamKey(item)) ? "from" : "to"} favorites`}
                    onPress={() => toggleFavorite(item)}
                    style={s.favorite}
                  >
                    <Text
                      style={[
                        s.heart,
                        favorites.includes(streamKey(item)) && s.saved,
                      ]}
                    >
                      {favorites.includes(streamKey(item)) ? "♥" : "♡"}
                    </Text>
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>
                    {tab === "favorites" ? "♡" : "⌕"}
                  </Text>
                  <Text style={s.title}>
                    {tab === "favorites" && !query
                      ? "Keep the good ones close."
                      : "No titles found."}
                  </Text>
                  <Text style={s.emptyText}>
                    {tab === "favorites" && !query
                      ? "Tap the heart beside any channel or movie to save it here."
                      : "Try another search or category. Your provider may not have added titles yet."}
                  </Text>
                </View>
              }
            />
            <View style={s.tabs}>
              {(
                [
                  { id: "live", icon: "▣", title: "Live TV" },
                  { id: "movie", icon: "▷", title: "Movies" },
                  { id: "favorites", icon: "♡", title: "Favorites" },
                ] as const
              ).map((item) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === item.id }}
                  key={item.id}
                  onPress={() => {
                    setTab(item.id);
                    setCategory("");
                    setQuery("");
                  }}
                  style={s.tab}
                >
                  <Text style={[s.tabIcon, tab === item.id && s.active]}>
                    {item.icon}
                  </Text>
                  <Text style={[s.tabText, tab === item.id && s.active]}>
                    {item.title}
                  </Text>
                  {tab === item.id && <View style={s.tabDot} />}
                </Pressable>
              ))}
            </View>
          </View>
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
  smallLogo: {
    width: 30,
    height: 30,
    backgroundColor: C.accent,
    borderRadius: 9,
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
  topbar: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  disconnect: { padding: 10 },
  disconnectText: { color: C.muted, fontSize: 11 },
  libraryHeader: { padding: 22, paddingBottom: 10 },
  libraryTitle: {
    fontSize: 28,
    letterSpacing: -0.8,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 22,
  },
  searchIcon: { fontSize: 29, color: C.dim, paddingLeft: 14 },
  search: { flex: 1, color: C.text, fontSize: 13, padding: 14 },
  clearSearch: { padding: 14 },
  chips: { paddingHorizontal: 22, gap: 8, paddingTop: 6, paddingBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 11, color: C.muted, fontWeight: "600" },
  chipTextActive: { color: C.bg },
  sectionHeading: {
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: C.muted,
    fontWeight: "700",
  },
  list: { paddingHorizontal: 22, paddingBottom: 20, flexGrow: 1 },
  streamCard: {
    flexDirection: "row",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  streamMain: {
    flex: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  artwork: {
    width: 56,
    height: 65,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artworkLetter: { color: "#ffffffa0", fontSize: 30, fontWeight: "300" },
  artworkImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  streamInfo: { flex: 1, gap: 7 },
  streamName: {
    color: C.text,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 19,
  },
  streamMeta: { fontSize: 9, color: C.accent, fontWeight: "700" },
  dim: { color: C.dim, fontWeight: "400" },
  playCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#223830",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: C.accent, fontSize: 10 },
  favorite: {
    minWidth: 44,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 6,
  },
  heart: { color: C.dim, fontSize: 26 },
  saved: { color: C.accent },
  tabs: {
    flexDirection: "row",
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingBottom: 10 },
  tabIcon: { color: C.dim, fontSize: 25 },
  tabText: { color: C.dim, fontSize: 10, fontWeight: "600" },
  active: { color: C.accent },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    position: "absolute",
    bottom: 0,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 15,
  },
  emptyIcon: { fontSize: 48, color: C.accent },
  emptyText: {
    color: C.muted,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 13,
  },
  libraryError: { marginHorizontal: 22 },
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
