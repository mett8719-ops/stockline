const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { signUploadSchema, signUploadResponse } = require("../model/upload.schema");
const c = require("../controllers/upload.controllers");

const router = express.Router();

// POST /api/v1/uploads/sign
router.post("/sign", validate({ body: signUploadSchema }), c.signUpload);
registerRoute({
  method: "post",
  path: "/uploads/sign",
  tags: ["Uploads"],
  summary: "Signer un upload Cloudinary pour la boutique connectée",
  description:
    "Génère une signature Cloudinary SHA-1 restreinte au dossier de la boutique (stockline/shops/:shopId/:ressource).",
  request: { body: signUploadSchema },
  responses: { 200: signUploadResponse },
});

module.exports = router;
