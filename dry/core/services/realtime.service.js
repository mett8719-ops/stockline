/**
 * Notifications et messagerie en TEMPS REEL (Socket.IO).
 *
 * Chaque connexion est authentifiee par le MEME jeton JWT que l'API REST, puis
 * inscrite dans des "salons" :
 *   user:<userId>         → notifications personnelles
 *   shop:<shopId>         → evenements de la boutique (vente, alerte stock)
 *   platform              → evenements plateforme (staff Super-Admin uniquement)
 *   conversation:<convId> → fil de messagerie
 *
 * ══ ISOLATION ══
 * Un socket ne rejoint QUE le salon de SA boutique. Il est donc techniquement
 * impossible qu'une boutique recoive les evenements d'une autre.
 */
const { Server } = require("socket.io");
const { verifyAccessToken } = require("../tokens");
const { PLATFORM_ROLE_LIST } = require("../constants");
const colors = require("colors");

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: true,
    },
    path: "/socket.io",
  });

  // ── Authentification a l'etablissement de la connexion ────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace("Bearer ", "");

      if (!token) return next(new Error("Jeton manquant"));

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.data.shopId = payload.shopId;
      return next();
    } catch {
      return next(new Error("Jeton invalide"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, shopId, role } = socket.data;

    socket.join(`user:${userId}`);
    if (shopId) socket.join(`shop:${shopId}`);
    if (PLATFORM_ROLE_LIST.includes(role)) socket.join("platform");

    // Rejoindre une conversation : double verification (boutique + participant)
    socket.on("conversation:join", async (conversationId) => {
      const ConversationModel = require("../../dry-app/shared/features/messaging/model/conversation.model");
      const conv = await ConversationModel.findById(conversationId)
        .select("shopId participants")
        .lean();

      if (!conv) return;

      const memeBoutique = !conv.shopId || String(conv.shopId) === String(shopId);
      const estParticipant = conv.participants?.some(
        (p) => String(p) === String(userId)
      );

      if (memeBoutique && estParticipant) {
        socket.join(`conversation:${conversationId}`);
      }
    });
  });

  console.log("Socket.IO initialise".green);
  return io;
}

/** Emet un evenement vers un utilisateur precis. */
function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Emet vers tous les utilisateurs connectes d'une boutique. */
function emitToShop(shopId, event, payload) {
  io?.to(`shop:${shopId}`).emit(event, payload);
}

/** Emet vers la console Super-Admin (nouvelle demande, impaye, incident). */
function emitToPlatform(event, payload) {
  io?.to("platform").emit(event, payload);
}

/** Emet un message dans un fil de conversation. */
function emitToConversation(conversationId, event, payload) {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
}

module.exports = {
  initRealtime, emitToUser, emitToShop, emitToPlatform, emitToConversation,
};
