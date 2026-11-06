import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import type { Credentials } from "./xtream";
type Props = {
  form: Credentials;
  setForm: (form: Credentials) => void;
  remember: boolean;
  setRemember: (value: boolean) => void;
  busy: boolean;
  restoring: boolean;
  error: string;
  onConnect: () => void;
  onCancel: () => void;
  onDemo: () => void;
};
export default function Login({
  form,
  setForm,
  remember,
  setRemember,
  busy,
  restoring,
  error,
  onConnect,
  onCancel,
  onDemo,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const wide = useWindowDimensions().width >= 850;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.login}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.brandRow}>
          <View style={s.logo}>
            <View style={s.triangle} />
          </View>
          <Text style={s.brand}>
            currentline<Text style={s.brandDot}>.</Text>
          </Text>
        </View>
        <View style={[s.columns, wide && s.wideColumns]}>
          <View style={[s.loginHero, wide && s.wideHero]}>
            <View
              style={s.posterScene}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Image
                source={require("../assets/demo/city.jpg")}
                style={[s.artPoster, s.leftPoster]}
              />
              <Image
                source={require("../assets/demo/summer.jpg")}
                style={[s.artPoster, s.rightPoster]}
              />
              <Image
                source={require("../assets/demo/horizon.jpg")}
                style={[s.artPoster, s.centerPoster]}
              />
              <View style={s.sceneBadge}>
                <Text style={s.sceneBadgeText}>✦ YOUR FRONT-ROW SEAT</Text>
              </View>
            </View>
            <Text style={s.eyebrow}>WELCOME TO CURRENTLINE</Text>
            <Text style={s.heroTitle}>Your cinema.{"\n"}Starts here.</Text>
            <Text style={s.heroDescription}>
              The stories you love. The moments you watch live. One beautiful
              place for it all.
            </Text>
            <View style={s.featureRow}>
              <Text style={s.feature}>● LIVE TV</Text>
              <Text style={s.feature}>▤ MOVIES</Text>
              <Text style={s.feature}>♡ YOUR LIST</Text>
            </View>
          </View>
          <View style={[s.loginCard, wide && s.wideCard]}>
            <View style={s.cardHeading}>
              <View style={s.stepBadge}>
                <Text style={s.stepText}>01</Text>
              </View>
              <View>
                <Text style={s.title}>Connect your playlist</Text>
                <Text style={s.cardSubtitle}>
                  A world of entertainment awaits.
                </Text>
              </View>
            </View>
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
                HTTP sends your login and streams without encryption. Use HTTPS
                when your provider supports it.
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
              onPress={onConnect}
              style={[s.button, (busy || restoring) && s.disabled]}
            >
              {busy || restoring ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <Text style={s.buttonText}>Connect & explore →</Text>
              )}
            </Pressable>
            {busy && (
              <Pressable style={s.demoButton} onPress={onCancel}>
                <Text style={s.link}>Cancel connection</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Pressable
          disabled={busy || restoring}
          onPress={onDemo}
          style={s.demoButton}
        >
          <Text style={s.demoText}>
            Take a look around <Text style={s.link}>with demo mode →</Text>
          </Text>
        </Pressable>
        <Text style={s.footnote}>
          Your provider. Your playlist. No content is included.
        </Text>
        <Text style={s.edition}>CURRENTLINE · CINEMA EDITION</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  columns: { gap: 24 },
  wideColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 48,
    marginTop: 20,
  },
  wideHero: { flex: 1 },
  wideCard: { flex: 1 },
  posterScene: {
    height: 220,
    marginTop: 15,
    marginBottom: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artPoster: {
    width: 119,
    height: 180,
    borderRadius: 12,
    position: "absolute",
    borderWidth: 1,
    borderColor: "#ffffff30",
  },
  leftPoster: {
    transform: [{ translateX: -97 }, { rotate: "-15deg" }],
    opacity: 0.7,
  },
  rightPoster: {
    transform: [{ translateX: 97 }, { rotate: "15deg" }],
    opacity: 0.7,
  },
  centerPoster: { width: 140, height: 205, transform: [{ translateY: -6 }] },
  sceneBadge: {
    position: "absolute",
    bottom: 0,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#142b29",
    borderWidth: 1,
    borderColor: "#426354",
  },
  sceneBadgeText: {
    color: "#d3ddbd",
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: "700",
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#10241c",
    marginLeft: 3,
  },
  cardHeading: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  stepBadge: {
    width: 36,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#233b37",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: "#83e7c4", fontWeight: "700", fontSize: 14 },
  cardSubtitle: { color: "#a3b0b9", fontSize: 10, marginTop: 4 },
  edition: {
    textAlign: "center",
    color: "#6c827e",
    letterSpacing: 2,
    fontSize: 8,
    marginTop: 18,
  },
  login: {
    padding: 24,
    paddingTop: 30,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 1100,
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
  brand: { color: C.text, fontSize: 23, fontWeight: "800", letterSpacing: -1 },
  brandDot: { color: C.accent },
  loginHero: { paddingVertical: 18 },
  eyebrow: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -1.7,
    fontWeight: "800",
    color: C.text,
  },
  heroDescription: {
    color: C.muted,
    lineHeight: 23,
    fontSize: 13,
    marginTop: 12,
    maxWidth: 330,
  },
  featureRow: { flexDirection: "row", gap: 19, marginTop: 24 },
  feature: {
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  loginCard: {
    minWidth: 0,
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
});
