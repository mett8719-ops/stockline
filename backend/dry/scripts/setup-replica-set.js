/**
 * Script d'initialisation du Replica Set MongoDB en local.
 *
 * Les transactions MongoDB (utilisées notamment pour la clôture des inventaires
 * afin de garantir l'atomicité des ajustements de stock) nécessitent que
 * MongoDB s'exécute en Replica Set (même single-node "rs0").
 */
const mongoose = require("mongoose");
const colors = require("colors");
require("dotenv").config({ path: "config.env" });

async function initReplicaSet() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/stockline";
  
  // Utiliser directConnection pour pouvoir s'adresser au standalone ou nœud initial
  const directUri = uri.includes("directConnection")
    ? uri
    : uri.includes("?")
    ? `${uri}&directConnection=true`
    : `${uri}?directConnection=true`;

  console.log(`Connexion à MongoDB sur : ${directUri}`.cyan);

  let connection;
  try {
    connection = await mongoose.createConnection(directUri, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
  } catch (err) {
    console.error(`Impossible de se connecter à MongoDB : ${err.message}`.red.bold);
    process.exit(1);
  }

  const adminDb = connection.db.admin();

  try {
    const status = await adminDb.command({ replSetGetStatus: 1 });
    console.log(`✓ Replica set déjà actif : ${status.set}`.green.bold);
  } catch (err) {
    if (err.codeName === "NotYetInitialized" || err.message.includes("no replSet set name")) {
      if (err.message.includes("no replSet set name")) {
        console.error(
          `❌ MongoDB n'a pas été démarré avec l'option --replSet rs0.\n` +
          `Sous Windows, ajoutez dans 'C:\\Program Files\\MongoDB\\Server\\<version>\\bin\\mongod.cfg' :\n\n` +
          `replication:\n  replSetName: rs0\n\nPuis redémarrez le service MongoDB.`
            .yellow.bold
        );
        process.exit(1);
      }

      console.log("Initialisation du replica set 'rs0'...".yellow);
      try {
        await adminDb.command({
          replSetInitiate: {
            _id: "rs0",
            members: [{ _id: 0, host: "127.0.0.1:27017" }],
          },
        });
        console.log("✓ Replica set 'rs0' initialisé avec succès !".green.bold);
      } catch (initErr) {
        console.error(`Échec de l'initialisation : ${initErr.message}`.red);
        process.exit(1);
      }
    } else {
      console.error(`Erreur replica set : ${err.message}`.red);
      process.exit(1);
    }
  } finally {
    await connection.close();
  }
}

initReplicaSet();
