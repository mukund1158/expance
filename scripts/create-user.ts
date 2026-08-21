// Create a user account (there is no public sign-up — Expance is a private app).
//
// Usage:
//   npx tsx scripts/create-user.ts "Full Name" email@example.com
//
// The password is read from the USER_PASSWORD environment variable so it never
// lands in shell history:
//   USER_PASSWORD='...' npx tsx scripts/create-user.ts "Mukund" mukund@example.com

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

async function main() {
  const [name, email] = process.argv.slice(2);
  const password = process.env.USER_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      'Usage: USER_PASSWORD=\'...\' npx tsx scripts/create-user.ts "Full Name" email@example.com'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  try {
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { name, passwordHash: await bcrypt.hash(password, 12) },
      create: {
        name,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`User ready: ${user.name} <${user.email}> (id: ${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
