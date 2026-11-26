const crypto = require("crypto");
const { signUpload, generateCloudinarySignature } = require("./controllers/upload.controllers");
const { signUploadSchema } = require("./model/upload.schema");

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function runSignUpload(req) {
  return new Promise((resolve, reject) => {
    const res = createMockRes();
    signUpload(req, res, (err) => {
      if (err) return reject(err);
      resolve(res);
    });
    setImmediate(() => {
      if (res.body !== null) resolve(res);
    });
  });
}

describe("ET-03 — POST /api/v1/uploads/sign (Signature Cloudinary)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: "stockline-demo",
      CLOUDINARY_API_KEY: "123456789012345",
      CLOUDINARY_API_SECRET: "super-secret-key",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("valide le schéma avec ressource par défaut 'products'", () => {
    const parsed = signUploadSchema.safeParse({});
    expect(parsed.success).toBe(true);
    expect(parsed.data.ressource).toBe("products");
  });

  it("refuse une ressource non autorisée", () => {
    const parsed = signUploadSchema.safeParse({ ressource: "../etc/passwd" });
    expect(parsed.success).toBe(false);
  });

  it("génère une signature SHA-1 valide et isole le dossier par shopId", async () => {
    const res = await runSignUpload({
      user: {
        id: "user-1",
        role: "admin",
        shopId: "shop-abc-123",
        permissions: ["products", "settings"],
      },
      validated: { body: { ressource: "logo" } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cloudName).toBe("stockline-demo");
    expect(res.body.data.apiKey).toBe("123456789012345");
    expect(res.body.data.folder).toBe("stockline/shops/shop-abc-123/logo");
    expect(res.body.data.uploadUrl).toBe(
      "https://api.cloudinary.com/v1_1/stockline-demo/image/upload"
    );

    const expectedSig = crypto
      .createHash("sha1")
      .update(
        `folder=stockline/shops/shop-abc-123/logo&timestamp=${res.body.data.timestamp}super-secret-key`
      )
      .digest("hex");
    expect(res.body.data.signature).toBe(expectedSig);
    expect(generateCloudinarySignature({ folder: "a", timestamp: 1 }, "sec")).toHaveLength(40);
  });

  it("refuse l'upload du logo à un caissier sans permission settings", async () => {
    await expect(
      runSignUpload({
        user: {
          id: "user-2",
          role: "caissier",
          shopId: "shop-abc-123",
          permissions: ["pos", "customers"],
        },
        validated: { body: { ressource: "logo" } },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("autorise un magasinier avec permission products pour ressource products", async () => {
    const res = await runSignUpload({
      user: {
        id: "user-3",
        role: "magasinier",
        shopId: "shop-xyz-999",
        permissions: ["products", "stock"],
      },
      validated: { body: { ressource: "products" } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.folder).toBe("stockline/shops/shop-xyz-999/products");
  });

  it("renvoie 503 si les variables Cloudinary ne sont pas configurées", async () => {
    delete process.env.CLOUDINARY_API_SECRET;

    await expect(
      runSignUpload({
        user: {
          id: "user-1",
          role: "admin",
          shopId: "shop-abc-123",
          permissions: ["products", "settings"],
        },
        validated: { body: { ressource: "products" } },
      })
    ).rejects.toMatchObject({ statusCode: 503, code: "CLOUDINARY_NOT_CONFIGURED" });
  });
});
