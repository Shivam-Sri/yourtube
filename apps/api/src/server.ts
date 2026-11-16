import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function main() {
  await prisma.$connect();
  console.log("PostgreSQL connected (Prisma)");
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}/api`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
