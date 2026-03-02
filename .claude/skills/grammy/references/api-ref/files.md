# Files API Reference

**Package:** `@grammyjs/files`

Enhanced file handling utilities.

## Installation

```ts
import { FileAdapter } from "@grammyjs/files";
```

## `FileAdapter`

Utilities for working with files.

### `getFile()`

Get file info and download URL.

```ts
const file = await ctx.getFile();
const fileUrl = file.getUrl();
```

### `downloadFile()`

Download file to local storage.

```ts
const file = await ctx.getFile();
const localPath = await file.download("./downloads/");
```

### `File.getUrl()`

Get direct download URL.

```ts
const url = file.getUrl();
// https://api.telegram.org/file/bot<token>/<file_path>
```

## File Upload

### Local Files

```ts
await ctx.replyWithDocument(new InputFile("./local/file.pdf"));
```

### URLs

```ts
await ctx.replyWithPhoto(new InputFile({ url: "https://example.com/image.jpg" }));
```

### Buffers

```ts
const buffer = fs.readFileSync("./image.png");
await ctx.replyWithPhoto(new InputFile(buffer, "image.png"));
```

### Streams

```ts
import { createReadStream } from "fs";

const stream = createReadStream("./video.mp4");
await ctx.replyWithVideo(new InputFile(stream, "video.mp4"));
```

## File Size Limits

| Type | Max Size |
|------|----------|
| Photos | 10 MB |
| Videos | 50 MB |
| Documents | 20 MB |
| Audio | 50 MB |
| Voice | 20 MB |

## Large File Handling

For files > 20MB, use local Bot API server:

```ts
const bot = new Bot("", {
  client: {
    apiRoot: "http://localhost:8081", // Local Bot API
  },
});
```

---

See `references/plugins/files.md` and `references/guide/files.md` for detailed usage guides.
