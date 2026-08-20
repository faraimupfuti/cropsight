import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Tag } from "@/components/ui/Tag";

const FAQS: [string, string][] = [
  ["Is CropSight's AI diagnosis final?", "No. Every AI prediction is a probabilistic estimate and is explicitly labelled as pending agronomist verification until a qualified reviewer confirms or corrects it."],
  ["What crop does the MVP support?", "The current release focuses on maize disease detection in Zimbabwe and Southern Africa — currently Cercospora Leaf Spot, Common Rust and Northern Leaf Blight. The architecture is built to add further crops and diseases without a rebuild."],
  ["Is the AI model live?", "CropSight calls a real inference workflow through a server-side function, with an automatic, clearly-labelled fallback if that endpoint is unreachable — so the product always works end-to-end, even before a production model endpoint is fully live."],
  ["Who can see our farm data?", "Data is isolated per organisation at the backend/database layer. Farmer names are never shown publicly on shared disease maps."],
  ["Can we export our data?", "Yes — agribusiness and enterprise organisations can export observation datasets and reports as CSV or JSON."],
];

const HOW = [
  ["Photograph", "A farmer photographs a maize leaf in the field, on any smartphone."],
  ["Assess", "A server-side inference call returns a prediction, confidence score and severity estimate."],
  ["Verify", "A qualified agronomist confirms, corrects, or marks the result uncertain."],
  ["Track", "Confirmed observations build a field health timeline and feed disease-intelligence dashboards."],
];

export default function Landing() {
  const navigate = useNavigate();
  const [pilotSubmitted, setPilotSubmitted] = useState(false);

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function submitPilot(e: React.FormEvent) {
    e.preventDefault();
    setPilotSubmitted(true);
  }

  return (
    <div className="fade-in">
      <nav className="sticky top-0 z-40 backdrop-blur border-b" style={{ background: "rgba(246,245,239,.85)", borderColor: "#E2E0D4" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo height={26} />
          <div className="hidden md:flex items-center gap-7">
            <a className="text-sm font-medium" style={{ color: "#4A4E42" }} onClick={() => scrollToId("how")}>How it works</a>
            <a className="text-sm font-medium" style={{ color: "#4A4E42" }} onClick={() => scrollToId("enterprise")}>For enterprise</a>
            <a className="text-sm font-medium" style={{ color: "#4A4E42" }} onClick={() => scrollToId("research")}>Research</a>
            <a className="text-sm font-medium" style={{ color: "#4A4E42" }} onClick={() => scrollToId("faq")}>FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-sm px-4 py-2" onClick={() => navigate("/login")}>Log in</button>
            <button className="btn-primary text-sm px-4 py-2" onClick={() => navigate("/login")}>Try CropSight</button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Tag variant="neutral">MAIZE · ZIMBABWE &amp; SOUTHERN AFRICA · MVP</Tag>
          <h1 className="mt-5 text-[2.6rem] leading-[1.08] font-semibold tracking-tight">
            Detect crop diseases before they become bigger problems.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "#4A4E42" }}>
            CropSight uses computer vision to help farmers, agronomists and agricultural organisations identify crop
            health problems and monitor disease trends — with every AI result routed for professional verification,
            never presented as a final diagnosis.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate("/login")}>Try CropSight →</button>
            <button className="btn-secondary px-5 py-3 text-sm" onClick={() => scrollToId("pilot")}>Request a Pilot</button>
          </div>
          <p className="mt-4 text-xs" style={{ color: "#4A4E42" }}>Demo mode · fictional data · not a substitute for professional agronomic advice</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#4A4E42" }}>Crop health assessment</span>
            <Tag variant="pending">Sample output</Tag>
          </div>
          <div className="rounded-lg h-44 mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#E6EFE6,#F6F5EF 60%)", border: "1px dashed #E2E0D4" }}>
            <span className="text-xs" style={{ color: "#7C8B72" }}>leaf image preview</span>
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>AI assessment</div><div className="font-semibold">Northern Leaf Blight</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Confidence</div><div className="font-semibold">91%</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Severity</div><div className="font-semibold">Moderate</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Status</div><div className="font-semibold" style={{ color: "#C2790E" }}>Pending review</div></div>
          </div>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: "#E2E0D4" }}>
        <div className="leaf-divider mb-3" />
        <h2 className="text-2xl font-semibold mb-8">How CropSight works</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {HOW.map(([t, d], i) => (
            <div key={t} className="card p-5">
              <div className="font-mono text-xs mb-3" style={{ color: "#006838" }}>0{i + 1}</div>
              <div className="font-semibold mb-1.5">{t}</div>
              <div className="text-sm" style={{ color: "#4A4E42" }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="enterprise" className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: "#E2E0D4" }}>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="leaf-divider mb-3" />
            <h2 className="text-2xl font-semibold mb-4">Disease intelligence for agribusiness</h2>
            <p className="text-sm mb-4" style={{ color: "#4A4E42" }}>
              A regional view of disease prevalence, severity and geographic spread across every farmer and field in
              your organisation — plotted on a real map, with clearly-labelled potential-outbreak flags rather than
              false certainty.
            </p>
            <ul className="text-sm space-y-2" style={{ color: "#4A4E42" }}>
              <li>· Disease prevalence &amp; trend charts</li>
              <li>· Live GIS map with clustering</li>
              <li>· Configurable potential-outbreak thresholds</li>
              <li>· CSV report export</li>
            </ul>
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#4A4E42" }}>Potential outbreak</div>
            <div className="font-semibold text-lg mb-1">Northern Leaf Blight</div>
            <div className="text-sm mb-4" style={{ color: "#4A4E42" }}>Mashonaland Central</div>
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="card p-3"><div className="text-lg font-semibold">27</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>fields</div></div>
              <div className="card p-3"><div className="text-lg font-semibold">43</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>observations</div></div>
              <div className="card p-3"><div className="text-lg font-semibold" style={{ color: "#AA3626" }}>↑</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>trend</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="research" className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: "#E2E0D4" }}>
        <div className="leaf-divider mb-3" />
        <h2 className="text-2xl font-semibold mb-4">Research dataset access</h2>
        <p className="text-sm max-w-2xl" style={{ color: "#4A4E42" }}>
          Researchers can filter, review and export validated, anonymised observations by crop, disease, region and
          date — without ever seeing farmer-identifying information.
        </p>
      </section>

      <section id="pilot" className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: "#E2E0D4" }}>
        <div className="card p-8 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-3">Request a pilot</h2>
            <p className="text-sm" style={{ color: "#4A4E42" }}>Tell us about your organisation and we'll follow up about running a CropSight pilot for the coming season.</p>
          </div>
          {pilotSubmitted ? (
            <div className="p-4 rounded-lg text-sm self-start" style={{ background: "#E6EFE6", color: "#003D21" }}>
              Thanks — your pilot request has been recorded for this demo session.
            </div>
          ) : (
            <form onSubmit={submitPilot} className="space-y-3">
              <input type="text" required placeholder="Organisation name" />
              <input type="email" required placeholder="Work email" />
              <select defaultValue="Farmer cooperative">
                <option>Farmer cooperative</option>
                <option>Agricultural company</option>
                <option>NGO / extension programme</option>
                <option>Research institution</option>
              </select>
              <label className="flex items-start gap-2 text-xs" style={{ color: "#4A4E42" }}>
                <input type="checkbox" required className="mt-0.5" style={{ width: "auto" }} />
                I agree to be contacted about this pilot and have read the{" "}
                <Link to="/privacy" className="underline" style={{ color: "#006838" }}>privacy policy</Link>.
              </label>
              <button className="btn-primary w-full py-2.5 text-sm">Submit request</button>
            </form>
          )}
        </div>
      </section>

      <section id="faq" className="max-w-6xl mx-auto px-6 py-16 border-t" style={{ borderColor: "#E2E0D4" }}>
        <div className="leaf-divider mb-3" />
        <h2 className="text-2xl font-semibold mb-8">Frequently asked questions</h2>
        <div className="max-w-3xl space-y-3">
          {FAQS.map(([q, a]) => (
            <div key={q} className="card p-5">
              <div className="font-semibold text-sm mb-1.5">{q}</div>
              <div className="text-sm" style={{ color: "#4A4E42" }}>{a}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 border-t text-center" style={{ borderColor: "#E2E0D4" }}>
        <h2 className="text-2xl font-semibold mb-5">See CropSight on your own fields.</h2>
        <div className="flex justify-center gap-3">
          <button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate("/login")}>Try CropSight →</button>
          <button className="btn-secondary px-5 py-3 text-sm" onClick={() => scrollToId("pilot")}>Request a Pilot</button>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: "#E2E0D4", color: "#4A4E42" }}>
        <div className="mb-2">
          <Link to="/privacy" className="underline mr-4" style={{ color: "#4A4E42" }}>Privacy</Link>
          <Link to="/terms" className="underline" style={{ color: "#4A4E42" }}>Terms</Link>
        </div>
        CropSight — demo build. AI predictions are not a substitute for professional agronomic advice.
      </footer>
    </div>
  );
}
