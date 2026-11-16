import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  // Prisma reads DATABASE_URL itself; documented in .env.example
};
