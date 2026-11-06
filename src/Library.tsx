import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import type { Catalog, Stream } from "./xtream";

type Tab = "discover" | "live" | "movie" | "favorites";
type Props = {
  catalog: Catalog;
  demo: boolean;
  favorites: string[];
  error: string;
  onPlay: (stream: Stream) => void;
  onFavorite: (stream: Stream) => void;
  onDisconnect: () => void;
};
const key = (item: Stream) => `${item.kind}:${item.id}`;
const art: Record<string, number> = {
  "11": require("../assets/demo/horizon.jpg"),
  "12": require("../assets/demo/city.jpg"),
  "13": require("../assets/demo/northern.jpg"),
  "14": require("../assets/demo/summer.jpg"),
};
const colors = ["#203f49", "#33334c", "#513a35", "#264947"];

function Artwork({
  item,
  demo,
  hero = false,
}: {
  item: Stream;
  demo: boolean;
  hero?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const source =
    demo && item.kind === "movie"
      ? art[item.id]
      : item.image && failed !== item.image
        ? { uri: item.image }
        : null;
  const tone =
    [...item.name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % colors.length;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[tone] }]}>
      <View style={s.artRing} />
      <View style={s.artRingSmall} />
      <Text style={[s.artLetter, hero && s.heroLetter]}>
        {item.name.slice(0, 1)}
      </Text>
      {source && (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          resizeMode={item.kind === "live" ? "contain" : "cover"}
          onError={() => setFailed(item.image ?? "")}
        />
      )}
    </View>
  );
}

export default function Library({
  catalog,
  demo,
  favorites,
  error,
  onPlay,
  onFavorite,
  onDisconnect,
}: Props) {
  const [tab, setTab] = useState<Tab>("discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sorted, setSorted] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 5 : width >= 650 ? 4 : width >= 480 ? 3 : 2;
  const pageWidth = Math.min(width, 1200);
  const tileWidth = (pageWidth - 48 - (columns - 1) * 14) / columns;
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const all = useMemo(() => [...catalog.movie, ...catalog.live], [catalog]);
  const categories =
    tab === "live"
      ? catalog.liveCategories
      : tab === "movie"
        ? catalog.movieCategories
        : [];
  const items = useMemo(() => {
    const source =
      tab === "favorites"
        ? all.filter((item) => favoriteSet.has(key(item)))
        : tab === "discover"
          ? all
          : catalog[tab];
    const filtered = source.filter(
      (item) =>
        (!category || item.category === category) &&
        item.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return sorted
      ? filtered.sort((a, b) => a.name.localeCompare(b.name))
      : filtered;
  }, [tab, all, favoriteSet, catalog, category, query, sorted]);
  const features = (catalog.movie.length ? catalog.movie : catalog.live).slice(
    0,
    5,
  );
  const featured = features[featureIndex % (features.length || 1)];
  const discovering = tab === "discover" && !query.trim();
  const categoryName = (item: Stream) =>
    (item.kind === "live"
      ? catalog.liveCategories
      : catalog.movieCategories
    ).find((c) => c.id === item.category)?.name ??
    (item.kind === "live" ? "Live television" : "Movie");
  function selectTab(next: Tab) {
    setTab(next);
    setCategory("");
    setQuery("");
    setSorted(false);
  }
  function favoriteButton(item: Stream, overlay = false) {
    const saved = favoriteSet.has(key(item));
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Remove" : "Add"} ${item.name} ${saved ? "from" : "to"} favorites`}
        accessibilityState={{ selected: saved }}
        onPress={() => onFavorite(item)}
        style={[
          s.favorite,
          overlay && s.favoriteOverlay,
          saved && s.favoriteSelected,
        ]}
      >
        <Text style={[s.heart, saved && s.mint]}>{saved ? "♥" : "♡"}</Text>
      </Pressable>
    );
  }
  function poster(item: Stream, size: number) {
    return (
      <View style={[s.posterCard, { width: size }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.name}`}
          onPress={() => onPlay(item)}
          style={s.poster}
        >
          <Artwork item={item} demo={demo} />
          <View style={s.posterBadge}>
            <Text style={s.badgeText}>
              {item.kind === "live" ? "● LIVE" : "MOVIE"}
            </Text>
          </View>
          <View style={s.posterCaption}>
            <Text style={s.posterArtTitle} numberOfLines={3}>
              {item.name}
            </Text>
          </View>
        </Pressable>
        {favoriteButton(item, true)}
        <Text style={s.posterTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {categoryName(item)}
          {demo ? " · Demo" : ""}
        </Text>
      </View>
    );
  }
  function shelf(title: string, subtitle: string, data: Stream[], next: Tab) {
    if (!data.length) return null;
    return (
      <View style={s.shelf}>
        <View style={s.sectionRow}>
          <View>
            <Text style={s.sectionTitle}>{title}</Text>
            <Text style={s.sectionSubtitle}>{subtitle}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            onPress={() => selectTab(next)}
            style={s.seeAll}
          >
            <Text style={s.link}>See all →</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data.slice(0, 12)}
          keyExtractor={key}
          contentContainerStyle={s.rail}
          renderItem={({ item }) => poster(item, width < 480 ? 144 : 184)}
        />
      </View>
    );
  }
  return (
    <View style={s.screen}>
      <View style={s.topbar}>
        <View style={s.brandRow}>
          <View style={s.brandMark}>
            <View style={s.triangle} />
          </View>
          <Text style={s.brand}>
            currentline<Text style={s.mint}>.</Text>
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Disconnect and remove saved login"
          onPress={onDisconnect}
          style={s.profile}
        >
          <Text style={s.profileText}>{demo ? "Exit demo" : "Sign out"}</Text>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{demo ? "D" : "C"}</Text>
          </View>
        </Pressable>
      </View>
      <FlatList
        key={`${tab}-${columns}`}
        data={discovering ? [] : items}
        numColumns={tab === "live" ? 1 : columns}
        keyExtractor={key}
        style={s.content}
        contentContainerStyle={s.contentInner}
        columnWrapperStyle={tab === "live" ? undefined : s.gridRow}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={s.heading}>
              <Text style={s.eyebrow}>
                {demo ? "THE DEMO COLLECTION" : "YOUR PERSONAL CINEMA"}
              </Text>
              <Text style={s.title}>
                {tab === "discover"
                  ? "Tonight starts here."
                  : tab === "movie"
                    ? "Find your next story."
                    : tab === "live"
                      ? "The world, live."
                      : "Your own collection."}
              </Text>
              <Text style={s.description}>
                {tab === "discover"
                  ? "Big stories. Live moments. All in your space."
                  : tab === "movie"
                    ? "A whole cinema, ready when you are."
                    : tab === "live"
                      ? "Tune into something you love."
                      : "All your favorites, always within reach."}
              </Text>
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  accessibilityLabel="Search titles"
                  value={query}
                  onChangeText={setQuery}
                  placeholder={
                    tab === "discover"
                      ? "Search movies and channels"
                      : "Search your collection"
                  }
                  placeholderTextColor="#788998"
                  autoCorrect={false}
                  style={s.searchInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                  style={s.clearSearch}
                >
                  <Text style={s.clearText}>{query ? "×" : ""}</Text>
                </Pressable>
              </View>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            {discovering && featured && (
              <View style={s.featureWrap}>
                <View style={[s.hero, width >= 650 && s.heroWide]}>
                  <Artwork item={featured} demo={demo} hero />
                  <View style={s.heroShade} />
                  <View style={s.heroTop}>
                    <Text style={s.featureBadge}>✦ IN THE SPOTLIGHT</Text>
                    <Text style={s.featureNumber}>
                      {String((featureIndex % features.length) + 1).padStart(
                        2,
                        "0",
                      )}{" "}
                      / {String(features.length).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={s.heroContent}>
                    <Text style={s.heroCategory}>
                      {categoryName(featured).toUpperCase()} ·{" "}
                      {featured.kind === "live" ? "LIVE TV" : "MOVIE"}
                      {demo ? "   ·   DEMO" : ""}
                    </Text>
                    <Text style={s.heroTitle} numberOfLines={3}>
                      {featured.name}
                    </Text>
                    <Text style={s.heroDescription}>
                      {demo
                        ? "Explore the collection. Connect your playlist to make it your movie night."
                        : "From your collection to the big screen. Press play and settle in."}
                    </Text>
                    <View style={s.heroActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Play featured ${featured.name}`}
                        onPress={() => onPlay(featured)}
                        style={s.playButton}
                      >
                        <View style={[s.triangle, s.darkTriangle]} />
                        <Text style={s.playButtonText}>
                          {demo ? "Explore demo" : "Watch now"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${favoriteSet.has(key(featured)) ? "Remove featured title from" : "Add featured title to"} favorites`}
                        onPress={() => onFavorite(featured)}
                        style={s.watchlist}
                      >
                        <Text style={s.watchlistText}>
                          {favoriteSet.has(key(featured))
                            ? "✓ Saved"
                            : "+ My list"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
                {features.length > 1 && (
                  <View style={s.pagination}>
                    {features.map((item, index) => (
                      <Pressable
                        key={key(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Feature ${item.name}`}
                        accessibilityState={{
                          selected: index === featureIndex,
                        }}
                        onPress={() => setFeatureIndex(index)}
                        style={s.dotTarget}
                      >
                        <View
                          style={[s.dot, featureIndex === index && s.dotActive]}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
            {discovering && (
              <>
                <View style={s.stats}>
                  {[
                    {
                      label: "Movies to explore",
                      value: catalog.movie.length,
                      next: "movie",
                    },
                    {
                      label: "Live channels",
                      value: catalog.live.length,
                      next: "live",
                    },
                    {
                      label: "In your list",
                      value: favorites.length,
                      next: "favorites",
                    },
                  ].map((stat) => (
                    <Pressable
                      accessibilityRole="button"
                      key={stat.label}
                      onPress={() => selectTab(stat.next as Tab)}
                      style={s.stat}
                    >
                      <Text style={s.statValue}>
                        {stat.value.toLocaleString()}
                      </Text>
                      <Text style={s.statLabel}>{stat.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {shelf(
                  "Movie night",
                  "Pick a story. Make an evening of it.",
                  catalog.movie,
                  "movie",
                )}
                {catalog.live.length > 0 && (
                  <View style={s.shelf}>
                    <View style={s.sectionRow}>
                      <View>
                        <Text style={s.sectionTitle}>Live, in the moment</Text>
                        <Text style={s.sectionSubtitle}>
                          Your channels are one tap away.
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="See all live channels"
                        onPress={() => selectTab("live")}
                        style={s.seeAll}
                      >
                        <Text style={s.link}>See all →</Text>
                      </Pressable>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.rail}
                    >
                      {catalog.live.slice(0, 8).map((item) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Play ${item.name}`}
                          key={key(item)}
                          onPress={() => onPlay(item)}
                          style={s.channelTile}
                        >
                          <View style={s.channelArt}>
                            <Artwork item={item} demo={demo} />
                          </View>
                          <Text style={s.channelName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={s.liveLabel}>● LIVE TV</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {shelf(
                  "Your watchlist",
                  "The ones you’re saving for later.",
                  all.filter((item) => favoriteSet.has(key(item))),
                  "favorites",
                )}
              </>
            )}
            {!discovering && (
              <>
                {!!categories.length && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chips}
                  >
                    {[{ id: "", name: "All categories" }, ...categories].map(
                      (item) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: category === item.id,
                          }}
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
                )}
                <View style={s.sectionRow}>
                  <Text style={s.resultCount}>
                    {items.length.toLocaleString()}{" "}
                    {items.length === 1 ? "title" : "titles"}
                    {query.trim() ? " found" : " in your collection"}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sort titles alphabetically"
                    accessibilityState={{ selected: sorted }}
                    onPress={() => setSorted(!sorted)}
                    style={s.sort}
                  >
                    <Text style={[s.sortText, sorted && s.mint]}>
                      {sorted ? "A–Z ↓" : "Sort A–Z"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        }
        renderItem={({ item, index }) =>
          tab !== "live" ? (
            poster(item, tileWidth)
          ) : (
            <View style={s.channelRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.name}`}
                onPress={() => onPlay(item)}
                style={s.channelMain}
              >
                <Text style={s.channelNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={s.channelLogo}>
                  <Artwork item={item} demo={demo} />
                </View>
                <View style={s.channelInfo}>
                  <Text style={s.channelRowTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={s.meta}>{categoryName(item)}</Text>
                  <Text style={s.liveLabel}>● LIVE TV</Text>
                </View>
                <View style={s.smallPlay}>
                  <View style={s.triangle} />
                </View>
              </Pressable>
              {favoriteButton(item)}
            </View>
          )
        }
        ListEmptyComponent={
          !discovering || !all.length ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{tab === "favorites" ? "♡" : "⌕"}</Text>
              <Text style={s.emptyTitle}>
                {tab === "favorites" && !query
                  ? "Keep the good ones close."
                  : "No titles found."}
              </Text>
              <Text style={s.description}>
                {tab === "favorites" && !query
                  ? "Tap the heart on a title to build your own collection."
                  : "Try another search or category."}
              </Text>
              {(query || category) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery("");
                    setCategory("");
                  }}
                  style={s.watchlist}
                >
                  <Text style={s.watchlistText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <Text style={s.footer}>
            {demo
              ? "DEMO COLLECTION · CONNECT YOUR PLAYLIST TO WATCH"
              : "YOUR PLAYLIST. YOUR SCREEN. YOUR TIME."}
          </Text>
        }
      />
      <View style={s.tabs}>
        {(
          [
            { id: "discover", label: "Discover", icon: "✦" },
            { id: "live", label: "Live TV", icon: "▣" },
            { id: "movie", label: "Movies", icon: "▤" },
            { id: "favorites", label: "Favorites", icon: "♡" },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => selectTab(item.id)}
            style={s.tab}
          >
            <View style={[s.tabIconWrap, tab === item.id && s.activeTab]}>
              <Text style={[s.tabIcon, tab === item.id && s.mint]}>
                {item.icon}
              </Text>
            </View>
            <Text style={[s.tabText, tab === item.id && s.mint]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090f16" },
  content: { flex: 1 },
  contentInner: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingBottom: 20,
  },
  topbar: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#1c2630",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#183a34",
    alignItems: "center",
    justifyContent: "center",
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 9,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#83e7c4",
    marginLeft: 2,
  },
  darkTriangle: { borderLeftColor: "#0b1915" },
  brand: {
    color: "#f7f5f0",
    fontWeight: "800",
    fontSize: 23,
    letterSpacing: -1,
  },
  mint: { color: "#83e7c4" },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  profileText: { color: "#91a0ab", fontSize: 11 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 18,
    backgroundColor: "#253038",
    borderWidth: 1,
    borderColor: "#3b494b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#dac9a6", fontSize: 12, fontWeight: "700" },
  heading: { padding: 24, paddingBottom: 20 },
  eyebrow: {
    color: "#bca680",
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 12,
  },
  title: {
    color: "#f7f5f0",
    fontSize: 30,
    letterSpacing: -1,
    fontWeight: "800",
  },
  description: { color: "#8b9aa7", fontSize: 12, lineHeight: 20, marginTop: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#26323b",
    backgroundColor: "#141e27",
    borderRadius: 13,
  },
  searchIcon: { color: "#91a0ab", paddingLeft: 14, fontSize: 28 },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 13,
    color: "#f7f5f0",
    minWidth: 0,
  },
  clearSearch: { padding: 14, minWidth: 44, minHeight: 44 },
  clearText: { color: "#91a0ab", fontSize: 18 },
  featureWrap: { paddingHorizontal: 24 },
  hero: {
    height: 440,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#46564f",
  },
  heroWide: { height: 480 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "#07111a35" },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    alignItems: "center",
  },
  featureBadge: {
    color: "#ede2cc",
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "800",
    backgroundColor: "#0a161dcc",
    borderRadius: 7,
    padding: 9,
  },
  featureNumber: { color: "#ffffffb0", fontSize: 10, fontWeight: "600" },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 23,
    backgroundColor: "#08111bbd",
  },
  heroCategory: {
    color: "#a4d8c7",
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -1.1,
    color: "#fffcf5",
    marginTop: 10,
  },
  heroDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: "#b2bec5",
    marginTop: 10,
    maxWidth: 400,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
  },
  playButton: {
    backgroundColor: "#83e7c4",
    borderRadius: 10,
    paddingHorizontal: 18,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  playButtonText: { color: "#0b1915", fontWeight: "800", fontSize: 12 },
  watchlist: {
    borderColor: "#ffffff45",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 17,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17252cc0",
  },
  watchlistText: { color: "#f4f4ee", fontSize: 12, fontWeight: "600" },
  pagination: { flexDirection: "row", justifyContent: "center", marginTop: 6 },
  dotTarget: {
    minWidth: 36,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 5, height: 5, borderRadius: 4, backgroundColor: "#43505a" },
  dotActive: { width: 22, backgroundColor: "#83e7c4" },
  stats: {
    margin: 24,
    marginTop: 12,
    paddingVertical: 18,
    flexDirection: "row",
    backgroundColor: "#111b24",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26303a",
  },
  stat: { flex: 1, alignItems: "center", gap: 6 },
  statValue: { color: "#f3eee4", fontSize: 22, fontWeight: "700" },
  statLabel: { color: "#93a2ae", fontSize: 9 },
  shelf: { marginBottom: 28 },
  sectionRow: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#f7f5f0",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionSubtitle: { color: "#7f909e", fontSize: 10, marginTop: 5 },
  seeAll: { minHeight: 44, justifyContent: "center" },
  link: { color: "#83e7c4", fontSize: 10, fontWeight: "600" },
  rail: { paddingHorizontal: 24, gap: 14 },
  posterCard: { marginBottom: 18 },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ffffff18",
  },
  artRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 150,
    borderWidth: 30,
    borderColor: "#ffffff08",
    top: -50,
    right: -130,
  },
  artRingSmall: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#ffffff18",
    bottom: -50,
    left: -60,
  },
  artLetter: {
    color: "#ffffff28",
    fontSize: 90,
    fontWeight: "800",
    textAlign: "center",
    marginTop: "20%",
  },
  heroLetter: { fontSize: 200, marginTop: 40 },
  posterBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#08121bd9",
  },
  badgeText: {
    color: "#e1d3b7",
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: "700",
  },
  posterCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 13,
    paddingTop: 20,
    backgroundColor: "#09131c99",
  },
  posterArtTitle: {
    color: "#f8efdf",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  posterTitle: {
    color: "#e8e9e5",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  meta: { color: "#8a9aa7", fontSize: 10, marginTop: 5, lineHeight: 15 },
  favorite: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  favoriteOverlay: {
    position: "absolute",
    right: 4,
    top: 4,
    backgroundColor: "#08121bd9",
  },
  favoriteSelected: { backgroundColor: "#193d35" },
  heart: { color: "#fff9ee", fontSize: 24 },
  gridRow: { paddingHorizontal: 24, gap: 14 },
  channelTile: {
    width: 132,
    backgroundColor: "#131e27",
    borderRadius: 15,
    borderColor: "#27323c",
    borderWidth: 1,
    padding: 15,
    alignItems: "center",
  },
  channelArt: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 13,
  },
  channelName: {
    color: "#e8e9e5",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: "100%",
  },
  liveLabel: { color: "#83e7c4", fontSize: 8, letterSpacing: 1, marginTop: 8 },
  channelRow: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: "#131e27",
    borderWidth: 1,
    borderColor: "#25323b",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
  },
  channelMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  channelNumber: { color: "#677c89", fontSize: 10 },
  channelLogo: { width: 52, height: 60, borderRadius: 10, overflow: "hidden" },
  channelInfo: { flex: 1 },
  channelRowTitle: {
    color: "#f3f1ec",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  smallPlay: {
    width: 28,
    height: 28,
    borderRadius: 15,
    backgroundColor: "#203a34",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  chip: {
    paddingHorizontal: 17,
    minHeight: 40,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2b3944",
    borderRadius: 22,
  },
  chipActive: { borderColor: "#83e7c4", backgroundColor: "#83e7c4" },
  chipText: { color: "#9caab5", fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: "#0a1915" },
  resultCount: { color: "#a1aeb8", fontSize: 11 },
  sort: { minHeight: 44, justifyContent: "center" },
  sortText: { color: "#9baab4", fontSize: 11 },
  empty: { margin: 24, paddingVertical: 50, alignItems: "center", gap: 12 },
  emptyIcon: { color: "#83e7c4", fontSize: 45 },
  emptyTitle: {
    color: "#f4f1e9",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  footer: {
    fontSize: 8,
    color: "#59707f",
    letterSpacing: 1.2,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  tabs: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#26323b",
    backgroundColor: "#101923",
  },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingBottom: 5 },
  tabIconWrap: {
    width: 50,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  activeTab: { backgroundColor: "#1b3933" },
  tabIcon: { color: "#879aa8", fontSize: 22 },
  tabText: { color: "#879aa8", fontSize: 9, fontWeight: "600" },
  error: {
    color: "#ffaba5",
    marginHorizontal: 24,
    marginBottom: 15,
    fontSize: 12,
    lineHeight: 19,
  },
});
