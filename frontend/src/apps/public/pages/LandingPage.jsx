import LandingHeader from "../components/LandingHeader.jsx";
import LandingHero from "../components/LandingHero.jsx";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <LandingHero />
      </main>
    </div>
  );
}
