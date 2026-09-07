export const metadata = {
  title: "User Data Deletion | AVERO OS",
  description: "Instructions for requesting deletion of user data from AVERO OS.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <header className="mb-12 border-b border-slate-800 pb-8">
          <p className="mb-3 text-sm font-semibold tracking-[0.25em] text-cyan-400">AVERO OS</p>
          <h1 className="text-4xl font-bold tracking-tight text-white">User Data Deletion</h1>
          <p className="mt-4 text-slate-400">Instructions for requesting deletion of personal data associated with AVERO OS.</p>
        </header>

        <div className="space-y-9 leading-7">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">How to request deletion</h2>
            <p>If you have used AVERO OS or a connected AVERO service and want your personal data deleted, submit a deletion request through the official support or contact channel associated with your AVERO account. State that you are requesting "User Data Deletion" and provide enough information for us to identify the relevant account, such as the email address or phone number associated with it.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">What happens next</h2>
            <p>We will verify the request where necessary, identify data associated with the requesting user, and delete or anonymize eligible personal data from AVERO systems. We may retain limited information where required for legal, security, fraud-prevention, accounting, dispute-resolution, or other legitimate compliance obligations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Meta and WhatsApp data</h2>
            <p>If your information was processed through a Meta or WhatsApp integration connected to AVERO, your request will cover eligible data stored by AVERO. Data independently controlled by Meta, WhatsApp, or another third-party provider is governed by that provider's own privacy and deletion processes.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Business-managed accounts</h2>
            <p>If you use AVERO through an organization, some information may be controlled by that organization. We may coordinate with the relevant business administrator when necessary to process a valid request while respecting applicable privacy requirements.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Contact</h2>
            <p>For a deletion request, contact AVERO through the official support or contact channel associated with your AVERO account and include the words "User Data Deletion" in your request.</p>
          </section>
        </div>

        <footer className="mt-14 border-t border-slate-800 pt-7 text-sm text-slate-500">© 2026 AVERO OS — The Business Operating System</footer>
      </div>
    </main>
  );
}
