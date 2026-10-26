import { MongoClient } from "mongodb";
const globalDb = globalThis as unknown as {
  mongo?: MongoClient;
  indexes?: Promise<unknown>;
};
export async function db() {
  const client = (globalDb.mongo ??= new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
    { serverSelectionTimeoutMS: 3000 },
  ));
  await client.connect();
  const database = client.db(process.env.MONGODB_DB || "wastewise");
  globalDb.indexes ??= Promise.all([
    database.collection("pickup_tracking").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("pickup_tracking").createIndex({ helperId: 1 }, { unique: true }),
    database.collection("tracking_pairings").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("email_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database
      .collection("auth_attempts")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("history").createIndex({ userId: 1, createdAt: -1 }),
    database.collection("discovery_points").createIndex({ userId: 1 }),
    database
      .collection("history")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database
      .collection("payment_orders")
      .createIndex({ orderId: 1 }, { unique: true }),
    database.collection("guides").createIndex({ userId: 1 }),
    database.collection("service_accounts").createIndex(
      { "participation.id": 1 },
      { unique: true, partialFilterExpression: { "participation.id": { $type: "string" } } },
    ),
  ]).catch((error) => {
    globalDb.indexes = undefined;
    throw error;
  });
  await globalDb.indexes;
  return database;
}
