# Storage Adapters API Reference

**Packages:** Various `@grammyjs/storage-*`

Storage adapters for sessions and other stateful plugins.

## Built-in Storage

### `MemorySessionStorage`

In-memory storage (default, data lost on restart).

```ts
import { MemorySessionStorage } from "grammy";

bot.use(session({
  storage: new MemorySessionStorage(),
}));
```

### Options

- `ttl` - Time-to-live in seconds

## MongoDB

**Package:** `@grammyjs/storage-mongodb`

```ts
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

bot.use(session({
  storage: new MongoDBAdapter({
    collection: db.collection("sessions"),
  }),
}));
```

## Redis

**Package:** `@grammyjs/storage-redis`

```ts
import { RedisAdapter } from "@grammyjs/storage-redis";
import { IORedis } from "ioredis";

const redis = new IORedis();

bot.use(session({
  storage: new RedisAdapter({
    instance: redis,
    ttl: 3600, // 1 hour
  }),
}));
```

## PostgreSQL

**Package:** `@grammyjs/storage-psql`

```ts
import { PsqlAdapter } from "@grammyjs/storage-psql";

bot.use(session({
  storage: new PsqlAdapter({
    pool: pgPool,
    tableName: "sessions",
  }),
}));

// Or with custom SQL
new PsqlAdapter({
  pool: pgPool,
  getSession: async (key) => {
    const result = await pool.query("SELECT data FROM sessions WHERE id = $1", [key]);
    return result.rows[0]?.data;
  },
  setSession: async (key, data) => {
    await pool.query(
      "INSERT INTO sessions (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [key, data]
    );
  },
  deleteSession: async (key) => {
    await pool.query("DELETE FROM sessions WHERE id = $1", [key]);
  },
});
```

## Supabase

**Package:** `@grammyjs/storage-supabase`

```ts
import { SupabaseAdapter } from "@grammyjs/storage-supabase";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, key);

bot.use(session({
  storage: new SupabaseAdapter({
    supabase,
    table: "sessions",
  }),
}));
```

## Firebase

**Package:** `@grammyjs/storage-firebase`

```ts
import { FirebaseAdapter } from "@grammyjs/storage-firebase";

bot.use(session({
  storage: new FirebaseAdapter({
    collection: firestore.collection("sessions"),
  }),
}));
```

## File Storage

**Package:** `@grammyjs/storage-file`

```ts
import { FileAdapter } from "@grammyjs/storage-file";

bot.use(session({
  storage: new FileAdapter({
    dirName: "./sessions",
  }),
}));
```

## Cloudflare Workers

**Package:** `@grammyjs/storage-cloudflare`

```ts
import { D1Adapter } from "@grammyjs/storage-cloudflare";

bot.use(session({
  storage: new D1Adapter({
    database: env.DB,
    tableName: "sessions",
  }),
}));
```

## Free Storage (grammY)

Free multi-device, persistent storage (no setup required):

```ts
import { freeStorage } from "@grammyjs/storage-free";

bot.use(session({
  storage: freeStorage(bot.token),
}));
```

## Custom Storage

Implement the `StorageAdapter` interface:

```ts
interface StorageAdapter<T> {
  read(key: string): Promise<T | undefined>;
  write(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

class MyStorage<T> implements StorageAdapter<T> {
  async read(key: string): Promise<T | undefined> {
    // Load from your storage
  }

  async write(key: string, value: T): Promise<void> {
    // Save to your storage
  }

  async delete(key: string): Promise<void> {
    // Delete from your storage
  }
}
```

---

See `references/plugins/session.md` for session storage usage.
