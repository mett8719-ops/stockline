/**
 * Base de données locale Dexie (IndexedDB).
 *
 * Version 1 : table `pendingSales`
 *   - clientOperationId  → clé primaire auto-générée (uuid côté caisse)
 *   - payload            → objet vente complet (lignes, paiements, dateVente…)
 *   - createdAt          → timestamp de création locale (ms depuis epoch)
 *   - tentatives         → nombre de tentatives de sync échouées
 */
import Dexie from "dexie";

export const db = new Dexie("stockline-offline");

db.version(1).stores({
  pendingSales: "clientOperationId, createdAt, tentatives",
});
