import { useState } from "react";
import { Shield, Store, Users } from "lucide-react";
import { useAuth } from "@/core/hooks/useAuth.js";
import UsersPage from "@/apps/boutique/features/users/pages/UsersPage.jsx";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const settingsTabs = [
  { id: "shop", label: "Boutique", icon: Store },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "roles", label: "Rôles & permissions", icon: Shield },
];

function ShopSettingsForm({ shop }) {
  const [values, setValues] = useState(() => ({
    nom: shop?.nom || "",
    adresse: shop?.adresse || "",
    telephone: shop?.telephone || "",
    email: shop?.email || "",
    rccm: shop?.rccm || "",
    devise: "XAF",
    delaiPaiementClient: "30",
    delaiPaiementFournisseur: "15",
  }));
  const [notice, setNotice] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setNotice("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setNotice(
      "Les modifications sont visibles dans ce formulaire, mais ne peuvent pas encore être enregistrées : l’API des paramètres boutique n’est pas disponible.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <section
        aria-labelledby="shop-information-title"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <h2
          className="text-sm font-semibold text-slate-900"
          id="shop-information-title"
        >
          Informations de la boutique
        </h2>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-name"
          >
            Nom de la boutique
          </label>
          <input
            className={inputClassName}
            id="shop-name"
            maxLength={120}
            name="nom"
            onChange={updateField}
            required
            value={values.nom}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-address"
          >
            Adresse
          </label>
          <input
            className={inputClassName}
            id="shop-address"
            maxLength={250}
            name="adresse"
            onChange={updateField}
            value={values.adresse}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-phone"
          >
            Téléphone
          </label>
          <input
            autoComplete="tel"
            className={inputClassName}
            id="shop-phone"
            name="telephone"
            onChange={updateField}
            type="tel"
            value={values.telephone}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-email"
          >
            E-mail
          </label>
          <input
            autoComplete="email"
            className={inputClassName}
            id="shop-email"
            name="email"
            onChange={updateField}
            type="email"
            value={values.email}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-rccm"
          >
            RCCM / Numéro fiscal
          </label>
          <input
            className={inputClassName}
            id="shop-rccm"
            maxLength={80}
            name="rccm"
            onChange={updateField}
            value={values.rccm}
          />
        </div>
        <div className="max-w-xs">
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="shop-currency"
          >
            Devise
          </label>
          <select
            className={inputClassName}
            disabled
            id="shop-currency"
            name="devise"
            onChange={updateField}
            value={values.devise}
          >
            <option value="XAF">Franc CFA d’Afrique centrale (XAF)</option>
          </select>
        </div>
      </section>

      <section
        aria-labelledby="shop-payment-thresholds-title"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <h2
          className="text-sm font-semibold text-slate-900"
          id="shop-payment-thresholds-title"
        >
          Seuils et alertes
        </h2>
        <div className="max-w-xs">
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="customer-payment-delay"
          >
            Délai de paiement client (jours)
          </label>
          <input
            className={inputClassName}
            id="customer-payment-delay"
            max="365"
            min="0"
            name="delaiPaiementClient"
            onChange={updateField}
            required
            step="1"
            type="number"
            value={values.delaiPaiementClient}
          />
        </div>
        <div className="max-w-xs">
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="supplier-payment-delay"
          >
            Délai de paiement fournisseur (jours)
          </label>
          <input
            className={inputClassName}
            id="supplier-payment-delay"
            max="365"
            min="0"
            name="delaiPaiementFournisseur"
            onChange={updateField}
            required
            step="1"
            type="number"
            value={values.delaiPaiementFournisseur}
          />
        </div>
      </section>

      {notice && (
        <p
          aria-live="polite"
          className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="status"
        >
          {notice}
        </p>
      )}
      <button
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
        type="submit"
      >
        Sauvegarder les modifications
      </button>
      <p className="text-xs text-slate-500">
        L’enregistrement sera disponible dès que l’API backend des paramètres
        boutique sera ajoutée.
      </p>
    </form>
  );
}

export default function SettingsPage() {
  const { permissions, user, shop } = useAuth();
  const canManageUsers =
    user?.role === "admin" || permissions.includes("users");
  const availableTabs = canManageUsers
    ? settingsTabs
    : settingsTabs.filter((tab) => tab.id === "shop");
  const [activeTab, setActiveTab] = useState("shop");

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div
        aria-label="Paramètres boutique"
        className="flex w-fit max-w-full flex-wrap rounded-lg bg-slate-200 p-1"
        role="tablist"
      >
        {availableTabs.map(({ id, label, icon: Icon }) => (
          <button
            aria-controls={`settings-panel-${id}`}
            aria-selected={activeTab === id}
            className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm transition ${
              activeTab === id
                ? "bg-white font-medium text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id={`settings-tab-${id}`}
            key={id}
            onClick={() => setActiveTab(id)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby="settings-tab-shop"
        className="space-y-4"
        hidden={activeTab !== "shop"}
        id="settings-panel-shop"
        role="tabpanel"
      >
        <ShopSettingsForm shop={shop} />
      </div>
      {canManageUsers && (
        <>
          <div
            aria-labelledby="settings-tab-users"
            hidden={activeTab !== "users"}
            id="settings-panel-users"
            role="tabpanel"
          >
            {activeTab === "users" && (
              <UsersPage embedded initialTab="members" />
            )}
          </div>
          <div
            aria-labelledby="settings-tab-roles"
            hidden={activeTab !== "roles"}
            id="settings-panel-roles"
            role="tabpanel"
          >
              {activeTab === "roles" && (
                <UsersPage embedded initialTab="roles" />
              )}
          </div>
        </>
      )}
    </section>
  );
}
