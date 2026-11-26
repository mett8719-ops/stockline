const { z } = require("zod");
const { registerSchema } = require("../../../../../core/openapi");

const ALLOWED_UPLOAD_RESOURCES = ["products", "logo", "documents", "avatars"];

const signUploadSchema = z.object({
  ressource: z.enum(ALLOWED_UPLOAD_RESOURCES).default("products"),
});

const signUploadResponse = registerSchema(
  "SignUploadResponse",
  z.object({
    cloudName: z.string(),
    apiKey: z.string(),
    timestamp: z.number().int(),
    signature: z.string(),
    folder: z.string(),
    uploadUrl: z.string().url(),
  })
);

module.exports = {
  ALLOWED_UPLOAD_RESOURCES,
  signUploadSchema,
  signUploadResponse,
};
