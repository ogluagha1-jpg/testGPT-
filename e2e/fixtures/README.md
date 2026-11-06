`playback.mp4` is a generated, silent 30-second solid-color H.264 test clip. It contains no third-party content. Regenerate with:

```sh
ffmpeg -f lavfi -i color=c=0x173b40:s=640x360:r=12:d=30 -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y e2e/fixtures/playback.mp4
```

The browser test serves byte ranges to exercise actual seeking. This fixture is only for tests and is not bundled into the app.
