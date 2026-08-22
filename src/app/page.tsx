import { CredibilitySection } from "@/components/marketing/credibility-section";
import { CommunityPreview } from "@/components/marketing/community-preview";
import { CtaBand } from "@/components/marketing/cta-band";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { ValueStrip } from "@/components/marketing/value-strip";

/**
 * The landing page renders for signed-in members too. It used to redirect them
 * to /feed, which made the header logo and every "/" link appear broken once
 * you were logged in.
 */
export default function HomePage() {
  return (
    <main>
      <Hero />
      <ValueStrip />
      <FeatureGrid />
      <CommunityPreview />
      <CredibilitySection />
      <CtaBand />
    </main>
  );
}
