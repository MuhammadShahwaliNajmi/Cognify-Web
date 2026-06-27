import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Methodology } from "@/components/sections/methodology";
import { Terminal } from "@/components/sections/terminal";
import { Curriculum } from "@/components/sections/curriculum";
import { Ecosystem } from "@/components/sections/ecosystem";
import { Pricing } from "@/components/sections/pricing";
import { Scholarships } from "@/components/sections/scholarships";
import { Besties } from "@/components/sections/besties";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Methodology />
        <Besties />
        <Curriculum />
        <Ecosystem />
        <Terminal />
        <Pricing />
        <Scholarships />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
