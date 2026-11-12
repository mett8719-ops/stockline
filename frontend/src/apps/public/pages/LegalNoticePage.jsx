import LegalPageLayout from "../components/LegalPageLayout.jsx";

export default function LegalNoticePage() {
  return (
    <LegalPageLayout title="Mentions légales">
      <section>
        <h2>Éditeur du site</h2>
        <dl className="space-y-2">
          <div>
            <dt className="inline font-semibold text-slate-800">Raison sociale : </dt>
            <dd className="inline">à renseigner par Stockline</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-800">Forme juridique : </dt>
            <dd className="inline">à confirmer</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-800">Siège social : </dt>
            <dd className="inline">adresse à compléter</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-800">Immatriculation : </dt>
            <dd className="inline">registre et numéro à confirmer</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-slate-800">Contact : </dt>
            <dd className="inline">coordonnées officielles à ajouter</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Direction de publication</h2>
        <p>
          Le nom et la qualité de la personne responsable de la publication
          doivent être indiqués par l’éditeur.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          Le prestataire d’hébergement, son adresse et les informations
          d’identification requises doivent être renseignés après confirmation
          de l’infrastructure réellement utilisée.
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les éléments du site et du service sont soumis aux droits qui leur
          sont applicables. Les titulaires, licences et conditions de
          réutilisation doivent être vérifiés avant publication de ces mentions.
        </p>
      </section>
      <section>
        <h2>Informations à valider</h2>
        <p>
          Cette page est un gabarit d’intégration. Les mentions d’identification
          de l’éditeur et de l’hébergeur doivent être complétées et vérifiées
          avec un conseil compétent avant mise en production.
        </p>
      </section>
    </LegalPageLayout>
  );
}
