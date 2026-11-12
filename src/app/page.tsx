import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Methodology } from "@/components/sections/methodology";
import { Terminal } from "@/components/sections/terminal";
import { Curriculum } from "@/components/sections/curriculum";
import { Ecosystem } from "@/components/sections/ecosystem";
import { Scholarships } from "@/components/sections/scholarships";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Methodology />
        <Curriculum />
        <Ecosystem />
        <Terminal />
        <Scholarships />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
