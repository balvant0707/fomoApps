import prisma from "../db.server";

const normalizeShop = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

const normalizeNullableText = (value) => {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text ? text : null;
};

const normalizeEmail = (value) => {
  const text = normalizeNullableText(value);
  if (text === undefined || text === null) return text;
  return text.toLowerCase();
};

const normalizeStatus = (value, installed) => {
  const text = String(value || "").trim().toLowerCase();
  if (text === "active" || text === "inactive") return text;
  return installed ? "active" : "inactive";
};

const isUnknownColumnError = (error) =>
  /Unknown column/i.test(String(error?.message || ""));

async function upsertWithSqlFallback({
  shop,
  accessToken,
  installed,
  status,
  firstName,
  lastName,
  email,
  phone,
  uninstalledAt,
}) {
  const now = new Date();
  const tables = ["shop", "Shop"];
  let lastError;

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${table}\` (\`shop\`, \`accessToken\`, \`installed\`, \`status\`, \`firstName\`, \`lastName\`, \`email\`, \`phone\`, \`uninstalledAt\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`accessToken\` = VALUES(\`accessToken\`),
           \`installed\` = VALUES(\`installed\`),
           \`status\` = VALUES(\`status\`),
           \`firstName\` = COALESCE(VALUES(\`firstName\`), \`firstName\`),
           \`lastName\` = COALESCE(VALUES(\`lastName\`), \`lastName\`),
           \`email\` = COALESCE(VALUES(\`email\`), \`email\`),
           \`phone\` = COALESCE(VALUES(\`phone\`), \`phone\`),
           \`uninstalledAt\` = VALUES(\`uninstalledAt\`),
           \`updatedAt\` = VALUES(\`updatedAt\`)`,
        shop,
        accessToken ?? null,
        installed ? 1 : 0,
        status,
        firstName ?? null,
        lastName ?? null,
        email ?? null,
        phone ?? null,
        uninstalledAt ?? null,
        now,
        now,
      );
      return true;
    } catch (error) {
      if (isUnknownColumnError(error)) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO \`${table}\` (\`shop\`, \`accessToken\`, \`installed\`, \`createdAt\`, \`updatedAt\`)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               \`accessToken\` = VALUES(\`accessToken\`),
               \`installed\` = VALUES(\`installed\`),
               \`updatedAt\` = VALUES(\`updatedAt\`)`,
            shop,
            accessToken ?? null,
            installed ? 1 : 0,
            now,
            now,
          );
          return true;
        } catch (legacyError) {
          lastError = legacyError;
          continue;
        }
      }
      lastError = error;
    }
  }

  throw lastError;
}

export async function upsertInstalledShop({
  shop: rawShop,
  accessToken,
  firstName,
  lastName,
  email,
  phone,
  status,
  installed = true,
}) {
  const shop = normalizeShop(rawShop);
  if (!shop) return null;
  const normalizedInstalled = installed !== false;
  const normalizedStatus = normalizeStatus(status, normalizedInstalled);
  const normalizedFirstName = normalizeNullableText(firstName);
  const normalizedLastName = normalizeNullableText(lastName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeNullableText(phone);
  const uninstalledAt = normalizedInstalled ? null : new Date();

  const updateData = {
    accessToken: accessToken ?? null,
    installed: normalizedInstalled,
    status: normalizedStatus,
    uninstalledAt,
  };
  const createData = {
    shop,
    accessToken: accessToken ?? null,
    installed: normalizedInstalled,
    status: normalizedStatus,
    uninstalledAt,
  };

  if (normalizedFirstName !== undefined) {
    updateData.firstName = normalizedFirstName;
    createData.firstName = normalizedFirstName;
  }
  if (normalizedLastName !== undefined) {
    updateData.lastName = normalizedLastName;
    createData.lastName = normalizedLastName;
  }
  if (normalizedEmail !== undefined) {
    updateData.email = normalizedEmail;
    createData.email = normalizedEmail;
  }
  if (normalizedPhone !== undefined) {
    updateData.phone = normalizedPhone;
    createData.phone = normalizedPhone;
  }

  try {
    return await prisma.shop.upsert({
      where: { shop },
      update: updateData,
      create: createData,
    });
  } catch (error) {
    console.error("[shop upsert] prisma upsert failed, trying SQL fallback:", error);
  }

  await upsertWithSqlFallback({
    shop,
    accessToken,
    installed: normalizedInstalled,
    status: normalizedStatus,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: normalizedEmail,
    phone: normalizedPhone,
    uninstalledAt,
  });

  try {
    return await prisma.shop.findUnique({ where: { shop } });
  } catch {
    return {
      shop,
      accessToken: accessToken ?? null,
      installed: normalizedInstalled,
      status: normalizedStatus,
      firstName: normalizedFirstName ?? null,
      lastName: normalizedLastName ?? null,
      email: normalizedEmail ?? null,
      phone: normalizedPhone ?? null,
      uninstalledAt,
    };
  }
}
