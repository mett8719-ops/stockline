/**
 * Connexion MongoDB partagee (Mongoose).
 *
 * Choix de configuration expliques :
 *  - `sanitizeFilter`  : neutralise les operateurs Mongo ($ne, $gt...) injectes
 *                        dans un filtre. Deuxieme barriere anti-injection NoSQL.
 *  - `maxPoolSize: 20` : plusieurs boutiques interrogent la MEME base en
 *                        parallele. Un pool trop petit fait attendre les caisses.
 *  - `autoIndex` OFF en prod : la creation d'index a chaud bloque la base.
 *                        On les cree au deploiement, pas au demarrage.
 */
const mongoose = require("mongoose");
const colors = require("colors");

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    mongoose.set("sanitizeFilter", true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 20),
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.log(
      `MongoDB connecte : ${conn.connection.name} sur ${conn.connection.host}`.green
    );

    // Surveillance de la connexion pendant toute la duree de vie du serveur
    mongoose.connection.on("error", (e) =>
      console.error(`Erreur MongoDB : ${e.message}`.red)
    );
    mongoose.connection.on("disconnected", () =>
      console.warn("MongoDB deconnecte".yellow)
    );

    return conn;
  } catch (e) {
    console.error(`Echec de connexion MongoDB : ${e.message}`.red.bold);
    // Sans base de donnees, l'API ne sert a rien : on arrete franchement
    // plutot que de laisser un serveur qui repond 500 a chaque requete.
    process.exit(1);
  }
};

module.exports = connectDB;
