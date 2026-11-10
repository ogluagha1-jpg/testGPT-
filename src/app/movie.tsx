import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMovieSession } from "../MovieSession";
import { loadMovieDetails, MovieDetails } from "../xtream";
import Player from "../Player";
const art: Record<string, number> = {
  "11": require("../../assets/demo/horizon.jpg"),
  "12": require("../../assets/demo/city.jpg"),
  "13": require("../../assets/demo/northern.jpg"),
  "14": require("../../assets/demo/summer.jpg"),
};
export default function MovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MovieContent key={id} id={id} />;
}
function MovieContent({ id }: { id: string }) {
  const { session } = useMovieSession();
  const stream = session?.catalog.movie.find((item) => item.id === id);
  const credentials = session?.credentials;
  const demo = session?.demo;
  const [result, setResult] = useState<{
    id: string;
    details: MovieDetails;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!credentials && !!stream && !demo);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const wide = useWindowDimensions().width >= 700;
  const details = result?.id === id ? result.details : undefined;
  useEffect(() => {
    const controller = new AbortController();
    if (!credentials || !stream || demo) {
      return;
    }
    void loadMovieDetails(credentials, stream.id, controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setResult({ id: stream.id, details });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "The provider’s movie details could not be loaded. You can still try playing the movie.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, credentials, stream, demo, attempt]);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  if (!session || !stream)
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.empty}>
          <Text style={s.title}>Choose a movie first</Text>
          <Text style={s.description}>
            Open a movie from your connected library to see its details.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={back}
            style={s.primary}
          >
            <Text style={s.primaryText}>Back to library</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  const title = details?.title ?? stream.name;
  const image = details?.image ?? stream.image;
  const source = demo
    ? art[stream.id]
    : image && image !== failedImage
      ? { uri: image }
      : undefined;
  const saved = session.favorites.includes(`movie:${stream.id}`);
  const category = session.catalog.movieCategories.find(
    (c) => c.id === stream.category,
  )?.name;
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to library"
          onPress={back}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>MOVIE DETAILS</Text>
        <Text style={s.brand}>currentline.</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.hero, wide && s.heroWide]}>
          <View style={[s.poster, wide && s.widePoster]}>
            <Text style={s.initial}>{title.charAt(0)}</Text>
            {source && (
              <Image
                source={source}
                style={s.image}
                resizeMode="cover"
                onError={() => setFailedImage(image ?? "")}
              />
            )}
          </View>
          <View style={s.intro}>
            <Text style={s.eyebrow}>
              {demo ? "DEMO COLLECTION" : (category ?? "YOUR PERSONAL CINEMA")}
            </Text>
            <Text style={s.title}>{title}</Text>
            <View style={s.badges}>
              {[
                details?.year,
                details?.duration,
                details?.rating ? `★ ${details.rating}` : undefined,
              ]
                .filter(Boolean)
                .map((value) => (
                  <Text key={value} style={s.badge}>
                    {value}
                  </Text>
                ))}
            </View>
            {details?.genre && <Text style={s.genre}>{details.genre}</Text>}
            <View style={s.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Watch ${title}`}
                onPress={() => setPlaying(true)}
                style={s.primary}
              >
                <Text style={s.primaryText}>
                  {demo ? "▷ Preview player" : "▷ Watch movie"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  saved
                    ? "Remove movie from favorites"
                    : "Save movie to favorites"
                }
                accessibilityState={{ selected: saved }}
                onPress={() => session.onFavorite(stream)}
                style={s.secondary}
              >
                <Text style={s.secondaryText}>
                  {saved ? "♥ Saved" : "♡ My list"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        {loading && (
          <View style={s.loading}>
            <ActivityIndicator color="#83e7c4" />
            <Text style={s.description}>Loading movie details…</Text>
          </View>
        )}
        {!!error && (
          <View style={s.errorCard}>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError("");
                setLoading(true);
                setAttempt((value) => value + 1);
              }}
              style={s.retry}
            >
              <Text style={s.secondaryText}>Retry details</Text>
            </Pressable>
          </View>
        )}
        <View style={s.section}>
          <Text style={s.sectionTitle}>The story</Text>
          <Text style={s.plot}>
            {demo
              ? "This is a demo title. Connect your Xtream server to see the provider’s movie synopsis, cast, and release information."
              : (details?.plot ??
                (loading
                  ? "Fetching the synopsis from your provider."
                  : "No synopsis has been supplied by your provider."))}
          </Text>
        </View>
        <View style={s.credits}>
          {[
            { label: "DIRECTOR", value: details?.director },
            { label: "CAST", value: details?.cast },
          ].map((item) => (
            <View key={item.label} style={s.credit}>
              <Text style={s.creditLabel}>{item.label}</Text>
              <Text style={s.creditText}>
                {item.value ?? (loading ? "Loading…" : "Not provided")}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.footnote}>
          {demo
            ? "DEMO TITLE · NO MOVIE CONTENT INCLUDED"
            : "Movie information supplied by your playlist provider."}
        </Text>
      </ScrollView>
      <Modal
        visible={playing}
        animationType="slide"
        onRequestClose={() => setPlaying(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        {playing && (
          <Player
            stream={{ ...stream, name: title }}
            credentials={credentials ?? null}
            demo={!!demo}
            catalog={session.catalog}
            saved={saved}
            onFavorite={() => session.onFavorite(stream)}
            onSelect={(item) => {
              setPlaying(false);
              router.setParams({ id: item.id });
            }}
            close={() => setPlaying(false)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090f16" },
  header: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#25343d",
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#192832",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#d9e9df", fontSize: 30 },
  headerTitle: { color: "#aec0b8", fontSize: 9, letterSpacing: 2 },
  brand: { color: "#83e7c4", fontSize: 13, fontWeight: "700" },
  scroll: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  hero: { gap: 24, alignItems: "center" },
  heroWide: { flexDirection: "row", alignItems: "flex-start" },
  poster: {
    width: 180,
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#263f45",
    borderWidth: 1,
    borderColor: "#43605c",
    justifyContent: "center",
    alignItems: "center",
  },
  widePoster: { width: 230 },
  image: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  initial: { fontSize: 100, color: "#9eb9a7" },
  intro: { flex: 1, width: "100%" },
  eyebrow: {
    color: "#bda780",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 12,
    fontWeight: "700",
  },
  title: {
    color: "#f8f3e8",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  badges: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 16 },
  badge: {
    color: "#c9dfd0",
    fontSize: 11,
    backgroundColor: "#1b302e",
    borderRadius: 6,
    padding: 8,
  },
  genre: { color: "#a7b9b8", fontSize: 12, lineHeight: 20, marginTop: 12 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 20 },
  primary: {
    backgroundColor: "#83e7c4",
    borderRadius: 12,
    minHeight: 49,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#10261c", fontWeight: "800", fontSize: 13 },
  secondary: {
    borderWidth: 1,
    borderColor: "#3b5555",
    borderRadius: 12,
    minHeight: 49,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#b9dfc9", fontSize: 12, fontWeight: "600" },
  loading: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 22,
  },
  description: { color: "#a2b3bb", fontSize: 12, lineHeight: 20 },
  section: { marginTop: 30 },
  sectionTitle: {
    color: "#efece1",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  plot: { color: "#aab9bf", fontSize: 14, lineHeight: 24 },
  credits: {
    marginTop: 26,
    backgroundColor: "#121f28",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#263c43",
    padding: 20,
    gap: 22,
  },
  credit: { gap: 8 },
  creditLabel: { color: "#89a89b", fontSize: 9, letterSpacing: 2 },
  creditText: { color: "#ced7d3", fontSize: 12, lineHeight: 21 },
  footnote: {
    color: "#66837f",
    fontSize: 9,
    lineHeight: 16,
    marginTop: 28,
    textAlign: "center",
  },
  errorCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#302628",
  },
  error: { color: "#edb6ad", fontSize: 12, lineHeight: 20 },
  retry: { alignSelf: "flex-start", paddingVertical: 12, minHeight: 44 },
  empty: { padding: 30, gap: 20 },
});
