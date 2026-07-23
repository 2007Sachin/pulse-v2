import "dotenv/config";
import { Client } from "pg";

interface FakeUser {
  pathwisse_user_id: string;
  name: string;
  role_template: "dev" | "design" | "marketing" | "product" | "data" | "early_career";
  github_username: string | null;
  portfolio_status: "draft" | "published";
  portfolio_slug: string;
}

const fakeUsers: FakeUser[] = [
  {
    pathwisse_user_id: "pw_seed_dev_001",
    name: "Aditi Rao",
    role_template: "dev",
    github_username: "aditirao-dev",
    portfolio_status: "published",
    portfolio_slug: "aditi-rao",
  },
  {
    pathwisse_user_id: "pw_seed_design_001",
    name: "Kabir Mehta",
    role_template: "design",
    github_username: null,
    portfolio_status: "draft",
    portfolio_slug: "kabir-mehta",
  },
  {
    pathwisse_user_id: "pw_seed_product_001",
    name: "Sana Iqbal",
    role_template: "product",
    github_username: null,
    portfolio_status: "draft",
    portfolio_slug: "sana-iqbal",
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const user of fakeUsers) {
      await client.query(
        `insert into users
           (pathwisse_user_id, name, role_template, github_username, portfolio_status, portfolio_slug)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (pathwisse_user_id) do update set
           name = excluded.name,
           role_template = excluded.role_template,
           github_username = excluded.github_username,
           portfolio_status = excluded.portfolio_status,
           portfolio_slug = excluded.portfolio_slug,
           updated_at = now()`,
        [
          user.pathwisse_user_id,
          user.name,
          user.role_template,
          user.github_username,
          user.portfolio_status,
          user.portfolio_slug,
        ],
      );
      console.log(`seeded user: ${user.name} (${user.role_template})`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
