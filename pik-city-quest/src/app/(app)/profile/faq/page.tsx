import { TopBar } from "@/components/app/top-bar";
import { Faq } from "./faq";

export const metadata = { title: "Support & FAQ" };
const ITEMS = [
  ["How do I start a quest?", "Open Quests, pick a route and tap START QUEST. Read the rules, confirm, and your first checkpoint unlocks. Progress is saved automatically."],
  ["How do I complete a mission?", "Go to the checkpoint shown as your Current Mission. Depending on the mission type you scan a QR code, check in with GPS, answer a quiz, enter a secret code, or upload a photo/video. Automatic missions are verified instantly; photo and video missions are reviewed by the PIK Tourism team."],
  ["How do I collect badges?", "Badges unlock automatically when you meet their requirements — completing missions at a destination, exploring an area, finishing a quest, or special experiences like sunset check-ins. Open a badge to see exactly what it needs."],
  ["How do I redeem rewards?", "Rewards appear in Profile → My Rewards. Show the QR code or voucher code to the partner; they scan it once. Points can also be exchanged for Tourist Exclusive offers in Exchange My Rewards."],
  ["QR scanning doesn't work", "Allow camera access when prompted (Settings → Site permissions on iOS/Android). Make sure the code is well lit and fills the frame. You can also upload a photo of the QR or type the token printed under it."],
  ["GPS permission and accuracy", "Allow location access for this site. Move outdoors, away from tall buildings, and wait for accuracy to improve. Check-ins are validated against the destination radius on our servers; if you're outside it the app tells you how far to go."],
  ["How long does verification take?", "QR, GPS, quiz and code missions are instant. Photo and video missions are reviewed by the PIK Tourism team, usually within a few hours. If rejected, you'll see the reason and can retry without losing progress."],
  ["Account problems", "Use Forgot password on the sign-in page, or contact PIK Tourism at visitor@piktourism.com / +62 819 1060 0099. You can update your details and privacy settings in Profile → Settings."],
  ["Is this an app I need to download?", "No — PIK City Quest is a web app. Scan the PIK City Quest QR code, sign in, and play in your browser. You can add it to your home screen for an app-like experience."],
];
export default function FaqPage() {
  return <div><TopBar back="/profile" title="Support & FAQ" /><div className="mx-auto max-w-lg lg:max-w-3xl px-4"><Faq items={ITEMS} /><div className="card p-4 mt-4 text-sm text-ink-soft">Still stuck? Email <a className="font-bold text-teal-700" href="mailto:visitor@piktourism.com">visitor@piktourism.com</a>, WhatsApp <a className="font-bold text-teal-700" href="https://wa.me/6281910600099">+62 819 1060 0099</a>, or visit the PIK Visitor Center. Address: Jl. Pantai Indah Kapuk No.1, Kamal Muara, Penjaringan, North Jakarta 14470.</div></div></div>;
}
