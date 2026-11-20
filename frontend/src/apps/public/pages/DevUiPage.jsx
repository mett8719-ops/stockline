import { useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  CreditCard,
  Package,
  Plus,
} from "lucide-react";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import Checkbox from "@/components/ui/Checkbox.jsx";
import ConfirmDialog from "@/components/ui/ConfirmDialog.jsx";
import DataTable from "@/components/ui/DataTable.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Input from "@/components/ui/Input.jsx";
import KpiCard from "@/components/ui/KpiCard.jsx";
import Modal from "@/components/ui/Modal.jsx";
import SearchInput from "@/components/ui/SearchInput.jsx";
import Select from "@/components/ui/Select.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import Tabs from "@/components/ui/Tabs.jsx";
import Textarea from "@/components/ui/Textarea.jsx";
import Toggle from "@/components/ui/Toggle.jsx";

const buttonVariants = [
  ["primary", "Principal"],
  ["platform", "Plateforme"],
  ["secondary", "Secondaire"],
  ["danger", "Danger"],
  ["ghost", "Fantôme"],
];

const sampleProducts = [
  { id: "riz", name: "Riz local 25kg", category: "Céréales", stock: 48, status: "En stock" },
  { id: "huile", name: "Huile de palme 5L", category: "Huiles", stock: 3, status: "Stock bas" },
  { id: "sucre", name: "Sucre cristal 1kg", category: "Épicerie", stock: 120, status: "En stock" },
];

function Section({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAccepted, setIsAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [feedback, setFeedback] = useState("");

  const productColumns = [
    { header: "Produit", accessorKey: "name", className: "font-medium text-slate-900" },
    { header: "Catégorie", accessorKey: "category" },
    { header: "Stock", accessorKey: "stock" },
    {
      header: "Statut",
      accessorKey: "status",
      cell: (status) => (
        <Badge variant={status === "En stock" ? "success" : "warning"}>
          {status}
        </Badge>
      ),
    },
  ];

  const tabs = [
    {
      id: "all",
      label: "Tous",
      badge: 16,
      content: (
        <p className="text-sm text-slate-600">
          Contenu de l’onglet « Tous ».
        </p>
      ),
    },
    {
      id: "products",
      label: "Produits",
      content: (
        <p className="text-sm text-slate-600">
          Contenu de l’onglet « Produits ».
        </p>
      ),
    },
    {
      id: "disabled",
      label: "Indisponible",
      disabled: true,
      content: null,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">Stockline</p>
              <p className="text-xs text-slate-500">Vitrine du design system</p>
            </div>
          </div>
          <Badge variant="info">ME-03</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-brand-700">
            Bibliothèque de composants
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            UI Kit Stockline
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Composants réutilisables, leurs variantes et leurs états. Les
            exemples ci-dessous sont interactifs.
          </p>
        </div>

        <Section
          title="Boutons"
          description="Variantes sémantiques, chargement et état désactivé."
        >
          <div className="flex flex-wrap gap-3">
            {buttonVariants.map(([variant, label]) => (
              <Button key={variant} variant={variant}>
                {label}
              </Button>
            ))}
            <Button isLoading>Enregistrement…</Button>
            <Button disabled variant="secondary">
              Désactivé
            </Button>
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un produit
            </Button>
          </div>
        </Section>

        <Section
          title="Champs de formulaire"
          description="Label, champ requis, icône, erreur et états désactivés."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Nom du produit"
              required
              placeholder="Ex. Riz local 25kg"
            />
            <Input
              label="Prix de vente"
              icon={<CreditCard className="h-4 w-4" />}
              type="number"
              placeholder="15 000"
            />
            <Input
              label="Adresse e-mail"
              type="email"
              value="adresse-invalide"
              readOnly
              error="Veuillez saisir une adresse e-mail valide."
            />
            <Select label="Catégorie" required defaultValue="">
              <option value="" disabled>
                Sélectionner une catégorie
              </option>
              <option value="cereales">Céréales</option>
              <option value="huiles">Huiles</option>
            </Select>
            <Textarea
              label="Description"
              placeholder="Ajouter une description…"
              rows={3}
            />
            <Textarea
              label="Note interne"
              error="Ce champ est requis."
              placeholder="Saisir une note"
            />
          </div>
        </Section>

        <Section
          title="Cases à cocher et interrupteurs"
          description="Contrôles accessibles avec un libellé et un état piloté."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Checkbox
              checked={isAccepted}
              onChange={(event) => setIsAccepted(event.target.checked)}
              label="J’accepte les conditions"
              description="Cette préférence est sauvegardée pour votre compte."
            />
            <Checkbox
              label="Option désactivée"
              disabled
              defaultChecked
            />
            <Toggle
              checked={isEnabled}
              onChange={(event) => setIsEnabled(event.target.checked)}
              label={isEnabled ? "Notifications activées" : "Notifications désactivées"}
            />
            <Toggle label="Interrupteur désactivé" disabled />
          </div>
        </Section>

        <Section title="Badges" description="Variantes de statut et d’espace.">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">En stock</Badge>
            <Badge variant="warning">Stock bas</Badge>
            <Badge variant="danger">Annulé</Badge>
            <Badge variant="info">En attente</Badge>
            <Badge variant="neutral">Brouillon</Badge>
            <Badge variant="platform">Plateforme</Badge>
          </div>
        </Section>

        <Section
          title="Indicateurs clés"
          description="Cartes synthétiques avec évolution et contexte."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Chiffre d’affaires"
              value="1 250 000 FCFA"
              change="+12,5 %"
              description="vs. mois précédent"
              icon={<ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
            />
            <KpiCard
              title="Produits en stock bas"
              value="8"
              change="+2"
              description="à réapprovisionner"
              trend="negative"
              icon={<Package className="h-5 w-5" aria-hidden="true" />}
            />
            <KpiCard
              title="Commandes en attente"
              value="12"
              description="Aucune variation cette semaine"
              trend="neutral"
              icon={<CircleHelp className="h-5 w-5" aria-hidden="true" />}
            />
          </div>
        </Section>

        <Section
          title="Recherche et onglets"
          description="Recherche effaçable et navigation au clavier entre onglets."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <SearchInput
              aria-label="Rechercher un produit"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
            <Tabs
              tabs={tabs}
              value={activeTab}
              onChange={setActiveTab}
              label="Exemple de navigation"
            />
          </div>
        </Section>

        <Section
          title="Tableau de données"
          description="Colonnes dynamiques, rendu de cellule personnalisé et chargement."
        >
          <div className="space-y-5">
            <DataTable
              caption="Exemple de catalogue de produits"
              columns={productColumns}
              data={sampleProducts}
            />
            <DataTable
              columns={productColumns}
              data={[]}
              emptyTitle="Aucun produit trouvé"
              emptyDescription="Ajoutez un produit pour le voir apparaître dans le catalogue."
            />
            <DataTable
              columns={productColumns}
              isLoading
              skeletonRows={2}
            />
          </div>
        </Section>

        <Section
          title="États vides, erreurs et chargement"
          description="États de remplacement pour les listes et les contenus asynchrones."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200">
              <EmptyState
                title="Aucune vente aujourd’hui"
                description="Les ventes apparaîtront ici."
              />
            </div>
            <div className="rounded-lg border border-slate-200">
              <ErrorState
                title="Connexion interrompue"
                description="Le serveur n’a pas répondu."
                onRetry={() => setFeedback("Nouvelle tentative demandée.")}
              />
            </div>
            <div className="space-y-3 rounded-lg border border-slate-200 p-5">
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton />
              <Skeleton count={3} />
            </div>
          </div>
          {feedback && (
            <p className="mt-3 text-sm text-brand-700" role="status">
              {feedback}
            </p>
          )}
        </Section>

        <Section
          title="Fenêtres de dialogue"
          description="Modale avec fermeture clavier et clic extérieur, puis confirmation avec mot de vérification."
        >
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setIsModalOpen(true)}>Ouvrir une modale</Button>
            <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
              Tester la confirmation
            </Button>
          </div>
        </Section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          Vitrine temporaire du design system Stockline.
        </footer>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Détails du produit"
        description="Exemple de modale accessible dans le design system."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                setFeedback("Action de la modale confirmée.");
                setIsModalOpen(false);
              }}
            >
              Continuer
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          Appuyez sur Échap, cliquez à l’extérieur ou utilisez le bouton pour
          fermer cette fenêtre. Le focus est conservé dans la modale.
        </p>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setFeedback("Action destructive confirmée.");
          setIsConfirmOpen(false);
        }}
        title="Supprimer ce produit ?"
        description="Cette action est irréversible et le produit sera retiré du catalogue."
        confirmLabel="Supprimer"
        verificationWord="SUPPRIMER"
      />
    </main>
  );
}
