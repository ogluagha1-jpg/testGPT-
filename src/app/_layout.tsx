import { MovieSessionProvider } from "../MovieSession";
import { Stack } from "expo-router";
export default function RootLayout() {
  return (
    <MovieSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0b1218" },
        }}
      />
    </MovieSessionProvider>
  );
}
