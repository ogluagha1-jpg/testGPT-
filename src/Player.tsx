import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Catalog, Credentials, Stream, playbackUrl } from "./xtream";

type Props = {
  stream: Stream;
  credentials: Credentials | null;
  demo: boolean;
  catalog: Catalog;
  saved: boolean;
  onFavorite: () => void;
  onSelect: (stream: Stream) => void;
  close: () => void;
};
const demoArt: Record<string, number> = {
  "11": require("../assets/demo/horizon.jpg"),
  "12": require("../assets/demo/city.jpg"),
  "13": require("../assets/demo/northern.jpg"),
  "14": require("../assets/demo/summer.jpg"),
};

export default function Player({
  stream,
  credentials,
  demo,
  catalog,
  saved,
  onFavorite,
  onSelect,
  close,
}: Props) {
  const source =
    credentials && !demo
      ? {
          uri: playbackUrl(credentials, stream),
          contentType:
            stream.kind === "live" ? ("hls" as const) : ("auto" as const),
        }
      : null;
  const player = useVideoPlayer(source, (instance) => {
    if (source) instance.play();
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const [controlError, setControlError] = useState("");
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const live = stream.kind === "live";
  const ready = !demo && status === "readyToPlay";
  const category = (
    live ? catalog.liveCategories : catalog.movieCategories
  ).find((item) => item.id === stream.category)?.name;
  const otherTitles = catalog[stream.kind]
    .filter((item) => item.id !== stream.id)
    .slice(0, 12);
  async function retry() {
    setControlError("");
    try {
      await player.replaceAsync(source);
      player.play();
    } catch {
      setControlError(
        "The stream is still unavailable. Try another title or check your connection.",
      );
    }
  }
  const stateLabel = demo
    ? "PLAYER PREVIEW"
    : status === "error"
      ? "STREAM UNAVAILABLE"
      : ready
        ? isPlaying
          ? "NOW PLAYING"
          : "PAUSED"
        : "CONNECTING";
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close player"
          onPress={close}
          style={s.back}
        >
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.brand}>
            currentline<Text style={s.mint}>.</Text>
          </Text>
          <Text style={s.headerCaption}>THE SCREEN IS YOURS</Text>
        </View>
        <View style={s.kindBadge}>
          <Text style={s.kindText}>{live ? "● LIVE" : "CINEMA"}</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.theater,
            landscape && {
              height: Math.max(200, height - 160),
              aspectRatio: undefined,
            },
          ]}
        >
          {demo ? (
            <>
              <Image
                source={
                  demoArt[stream.id] ?? require("../assets/demo/horizon.jpg")
                }
                style={s.previewImage}
              />
              <View style={s.previewShade} />
              <View style={s.previewLabel}>
                <Text style={s.previewIcon}>▷</Text>
                <Text style={s.previewTitle}>Your next great watch.</Text>
                <Text style={s.previewDescription}>
                  Player preview · Connect your server to watch.
                </Text>
              </View>
            </>
          ) : (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              nativeControls
              fullscreenOptions={{ enable: true }}
              contentFit="contain"
            />
          )}
          {!demo && (status === "loading" || status === "idle") && (
            <View style={s.videoOverlay}>
              <ActivityIndicator color="#83e7c4" size="large" />
              <Text style={s.overlayTitle}>Setting the scene…</Text>
              <Text style={s.overlayText}>Connecting to your stream</Text>
            </View>
          )}
          {!demo && status === "error" && (
            <View style={s.videoOverlay}>
              <Text style={s.overlayTitle}>A pause in the story.</Text>
              <Text style={s.overlayText}>
                The stream may be offline or use an unsupported format.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void retry()}
                style={s.retry}
              >
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={s.body}>
          <View style={s.titleRow}>
            <View style={s.titleBlock}>
              <Text style={s.eyebrow}>{stateLabel}</Text>
              <Text style={s.title}>{stream.name}</Text>
              <View style={s.metadata}>
                <Text style={s.metadataText}>
                  {category ?? (live ? "Live television" : "On demand")}
                </Text>
                <Text style={s.metadataDot}>·</Text>
                <Text style={s.metadataText}>
                  {demo
                    ? "Demo title"
                    : live
                      ? "Live stream"
                      : stream.extension.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                saved
                  ? "Remove playing title from favorites"
                  : "Save playing title to favorites"
              }
              accessibilityState={{ selected: saved }}
              onPress={onFavorite}
              style={[s.save, saved && s.saveActive]}
            >
              <Text style={[s.saveIcon, saved && s.mint]}>
                {saved ? "♥" : "♡"}
              </Text>
            </Pressable>
          </View>
          {!!controlError && (
            <Text accessibilityRole="alert" style={s.error}>
              {controlError}
            </Text>
          )}
          {demo && (
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>A preview of your movie night</Text>
              <Text style={s.infoText}>
                Connect your Xtream playlist to watch. Playback controls appear
                directly on the video. You can save demo titles here.
              </Text>
            </View>
          )}
          {!!otherTitles.length && (
            <View style={s.nextSection}>
              <Text style={s.sectionTitle}>
                {live ? "Keep exploring live" : "More from your collection"}
              </Text>
              <Text style={s.sectionHint}>
                {live
                  ? "Switch channels without leaving your seat."
                  : "Another story is always waiting."}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.nextRail}
              >
                {otherTitles.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${item.name}`}
                    key={item.id}
                    onPress={() => onSelect(item)}
                    style={s.nextCard}
                  >
                    <View style={s.nextArt}>
                      {demo && demoArt[item.id] ? (
                        <Image
                          source={demoArt[item.id]}
                          style={s.previewImage}
                        />
                      ) : (
                        <Text style={s.nextLetter}>{item.name.charAt(0)}</Text>
                      )}
                      <View style={s.nextPlay}>
                        <Text style={s.nextPlayText}>▷</Text>
                      </View>
                    </View>
                    <Text style={s.nextTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={s.nextMeta}>
                      {live ? "● LIVE TV" : "ON DEMAND"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <Text style={s.footer}>CURRENTLINE · MADE FOR YOUR MOMENT</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090f16" },
  scroll: {
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#25313a",
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17232d",
    borderRadius: 13,
  },
  backIcon: { color: "#e2eee8", fontSize: 32 },
  headerCenter: { alignItems: "center" },
  brand: {
    color: "#f5f3ec",
    fontSize: 21,
    letterSpacing: -1,
    fontWeight: "800",
  },
  mint: { color: "#83e7c4" },
  headerCaption: {
    color: "#8a9f9a",
    fontSize: 7,
    letterSpacing: 2,
    marginTop: 4,
  },
  kindBadge: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#37514b",
    borderRadius: 6,
  },
  kindText: {
    color: "#bad4bd",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  theater: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  previewImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  previewShade: { ...StyleSheet.absoluteFill, backgroundColor: "#06121b80" },
  previewLabel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  previewIcon: { color: "#c9f4de", fontSize: 40 },
  previewTitle: {
    color: "#f8f2e8",
    fontWeight: "700",
    fontSize: 21,
    letterSpacing: -0.6,
  },
  previewDescription: { color: "#d3dcd6", fontSize: 10, textAlign: "center" },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0b1721e8",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  overlayTitle: { color: "#f6f3e9", fontSize: 18, fontWeight: "700" },
  overlayText: {
    color: "#9daeb8",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 300,
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#83e7c4",
    borderRadius: 8,
  },
  retryText: { color: "#0e231c", fontSize: 12, fontWeight: "700" },
  body: { padding: 22 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },
  titleBlock: { flex: 1 },
  eyebrow: {
    color: "#bda980",
    letterSpacing: 2,
    fontSize: 8,
    fontWeight: "700",
    marginBottom: 9,
  },
  title: {
    color: "#faf7ef",
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.7,
    fontWeight: "800",
  },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metadataText: { color: "#93a6b0", fontSize: 11 },
  metadataDot: { color: "#617882" },
  save: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#1a2731",
    borderWidth: 1,
    borderColor: "#30414a",
    justifyContent: "center",
    alignItems: "center",
  },
  saveActive: { backgroundColor: "#203e35", borderColor: "#477a62" },
  saveIcon: { color: "#d6e1da", fontSize: 27 },
  error: { color: "#ffb0a8", fontSize: 12, lineHeight: 18, marginTop: 15 },
  infoCard: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "#14251f",
    borderWidth: 1,
    borderColor: "#2e4c3b",
    borderRadius: 13,
  },
  infoTitle: { color: "#c6dcc4", fontSize: 12, fontWeight: "700" },
  infoText: { color: "#91ab9a", fontSize: 11, lineHeight: 18, marginTop: 7 },
  nextSection: { marginTop: 28 },
  sectionTitle: {
    color: "#edece4",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  sectionHint: { color: "#849ca8", fontSize: 11, marginTop: 6 },
  nextRail: { gap: 12, paddingTop: 17 },
  nextCard: { width: 132 },
  nextArt: {
    height: 95,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#273d45",
    justifyContent: "center",
    alignItems: "center",
  },
  nextLetter: { fontSize: 44, color: "#aec2b9" },
  nextPlay: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: "#0a1823ba",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  nextPlayText: { color: "#b9efd1", fontSize: 16 },
  nextTitle: {
    color: "#d6e0dc",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 9,
  },
  nextMeta: { color: "#769b8a", fontSize: 7, letterSpacing: 1.3, marginTop: 6 },
  footer: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#5e7b81",
    letterSpacing: 1.5,
  },
});
