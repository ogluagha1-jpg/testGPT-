import { test, expect } from "@playwright/test";

test("demo supports category filters, search, favorites, movies, and sign out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Connect your playlist")).toBeVisible();
  await page.getByText("with demo mode →").click();
  await page.getByRole("tab", { name: "Live TV", exact: true }).click();
  await expect(page.getByText("World Report", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nature", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play Wild Earth", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("World Report", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add Wild Earth to favorites" })
    .click();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Play Wild Earth", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Wild Earth from favorites" })
    .click();
  await expect(page.getByText("Keep the good ones close.")).toBeVisible();
  await page.getByRole("tab", { name: "Movies" }).click();
  await page.getByLabel("Search titles").fill("quiet");
  await expect(
    page.getByRole("button", { name: "Play The Quiet City", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play Beyond the Horizon", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/currentline-movies.png",
    fullPage: true,
  });
  await page.getByLabel("Disconnect and remove saved login").click();
  await expect(page.getByText("Connect your playlist")).toBeVisible();
  expect(errors).toEqual([]);
});

test("connects to a mocked Xtream provider and reloads saved favorites", async ({
  page,
}) => {
  await page.route(
    "https://provider.example/player_api.php*",
    async (route) => {
      const action = new URL(route.request().url()).searchParams.get("action");
      const json = !action
        ? { user_info: { auth: 1, status: "Active" } }
        : action.includes("categories")
          ? [{ category_id: 1, category_name: "Test category" }]
          : [
              {
                stream_id: 17,
                name:
                  action === "get_live_streams"
                    ? "Test live channel"
                    : "Test movie",
                category_id: 1,
                container_extension: "mp4",
              },
            ];
      await route.fulfill({ json });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Connect & explore" }).click();
  await expect(
    page.getByText("Enter your username and password."),
  ).toBeVisible();
  async function login() {
    await page.getByLabel("Server address").fill("https://provider.example");
    await page.getByLabel("Username", { exact: true }).fill("demo-user");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Connect & explore" }).click();
    await page.getByRole("tab", { name: "Live TV", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Play Test live channel", exact: true }),
    ).toBeVisible();
  }
  await login();
  await page
    .getByRole("button", { name: "Add Test live channel to favorites" })
    .click();
  await page.getByLabel("Disconnect and remove saved login").click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await login();
  await page.getByRole("tab", { name: "Favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Play Test live channel", exact: true }),
  ).toBeVisible();
});

test("cinema discovery has selectable features, responsive posters, and working sorting", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("with demo mode →").click();
  await expect(page.getByText("Tonight starts here.")).toBeVisible();
  await page
    .getByRole("button", { name: "Feature Northern Lights", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play featured Northern Lights" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add featured title to favorites" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove featured title from favorites" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/currentline-discover.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "See all Movie night" }).click();
  await page
    .getByRole("button", { name: "Sort titles alphabetically" })
    .click();
  const titles = await page
    .getByRole("button", { name: /^Play / })
    .allTextContents();
  expect(titles).toHaveLength(4);
  expect(titles[0]).toContain("Beyond the Horizon");
  expect(titles[3]).toContain("The Quiet City");
  const posterImage = page
    .getByRole("button", { name: "Play Beyond the Horizon", exact: true })
    .locator("img");
  await expect(posterImage).toHaveCount(1);
  expect(
    await posterImage.evaluate(
      (img) =>
        img.getBoundingClientRect().width <=
        img.closest('[role="button"]')!.getBoundingClientRect().width + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/currentline-grid.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Drama", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play Northern Lights", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Search titles").fill("no-match");
  await expect(page.getByText("No titles found.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play Northern Lights", exact: true }),
  ).toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("button", {
        name: "Play Beyond the Horizon",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/currentline-wide.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
