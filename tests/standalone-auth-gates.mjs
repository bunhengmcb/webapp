import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "app/page.tsx",
  "app/local-identity.ts",
  "app/api/state/route.ts",
  "app/api/audit/route.ts",
  "app/api/users/route.ts",
  "app/api/profile/route.ts",
  "app/api/item-photo/route.ts",
  "app/api/transaction-evidence/route.ts",
  "app/api/register/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/logout/route.ts",
];
const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const forbidden of [
  "signin-with-chatgpt",
  "signout-with-chatgpt",
  "oai-authenticated-user-",
  "dream14gaming@gmail.com",
  "PASSWORD_HASH_B64URL",
]) assert(!source.includes(forbidden), `standalone auth still contains ${forbidden}`);

for (const file of ["state", "audit", "users", "profile", "item-photo", "transaction-evidence"])
  assert(
    fs.readFileSync(`app/api/${file}/route.ts`, "utf8").includes("requestIdentity"),
    `${file} API does not use the D1 session identity`,
  );

const login = fs.readFileSync("app/api/auth/login/route.ts", "utf8");
assert(login.includes("__Host-mcb_session="), "login cookie is not host-bound");
for (const attribute of ["HttpOnly", "Secure", "SameSite=Strict"])
  assert(login.includes(attribute), `session cookie missing ${attribute}`);
assert(login.includes("sameOrigin(request)"), "login lacks same-origin enforcement");

const register = fs.readFileSync("app/api/register/route.ts", "utf8");
assert(register.includes("BOOTSTRAP_REGISTRATION_TOKEN"), "first Developer lacks a bootstrap secret");
assert(register.includes("auth_bootstrap"), "first Developer claim is not concurrency-controlled");
assert(register.includes("env.DB.batch(statements)"), "registration writes are not atomic");
assert(
  fs.readFileSync("app/register/page.tsx", "utf8").includes('requestedRole: firstAccount ? "Developer" : role'),
  "first-account registration does not explicitly submit the Developer role",
);

console.log("STANDALONE AUTH GATES: PASS");
