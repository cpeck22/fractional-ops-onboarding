/* eslint-disable react/no-unescaped-entities */
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '../Fractional-Ops_Symbol_Main.png';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-24 w-48 mb-4">
            <Image
              src={Logo}
              alt="Fractional Ops logo"
              width={192}
              height={96}
              priority
            />
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 text-sm mb-4"
          >
            ← Back to Home
          </button>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-4">Fractional Ops Site Terms and Conditions</h1>
          <p className="text-sm text-gray-600 mb-4">Last updated: November 26, 2025</p>
          
          <p className="font-bold text-red-600 mb-4">
            THIS AGREEMENT CONTAINS A RELEASE OF LIABILITY AND WAIVER OF CERTAIN RIGHTS. YOU ARE ADVISED TO READ THIS CAREFULLY BEFORE AGREEING TO ITS TERMS.
          </p>

          <p className="mb-4">
            These Terms and Conditions ("Terms") form an agreement ("Agreement") between you, or, if you are entering into this Agreement on behalf of an entity or an organization, that entity or organization ("you" and "your") and Fractional Ops Global Inc. ("Fractional Ops," "us," or "we").
          </p>

          <p className="mb-4">
            Fractional Ops provides users of the Site ("Users") with the opportunity to access and use information, data, content, and "Claire" the AI-CRO ("Content"), as well as services, resources, and offerings ("Offerings") through this website and other Fractional Ops websites and subdomains (collectively the "Site"). Fractional Ops is willing to allow you to become a User of the Site, including the available Content and Offerings, if you agree to be bound by this Agreement.
          </p>

          <p className="mb-4">
            This Agreement will form a binding legal agreement between you and Fractional Ops as of the date you first accept this Agreement, including electronically ("Effective Date"). You and Fractional Ops are each a party to this Agreement and together are the parties to this Agreement.
          </p>

          <p className="font-bold mb-4">
            PLEASE READ THIS AGREEMENT CAREFULLY. THIS AGREEMENT FORMS A LEGALLY BINDING AGREEMENT BETWEEN YOU AND FRACTIONAL OPS. BY ACCESSING AND USING THE SITE, WHICH INCLUDES ALL CONTENT OR OFFERINGS, YOU AGREE THAT YOU HAVE READ, UNDERSTAND, AND AGREE TO COMPLY WITH AND BE BOUND BY THIS AGREEMENT.
          </p>

          <p className="font-bold mb-4">
            BY ENTERING INTO THIS AGREEMENT, YOU MAY BE WAIVING CERTAIN RIGHTS. IN PARTICULAR, THIS AGREEMENT CONTAINS PROVISIONS PROVIDING FOR MANDATORY BINDING ARBITRATION AND WAIVER OF JURY TRIALS (IN THE SECTION BELOW TITLED "DISPUTE RESOLUTION"), WHICH LIMIT YOUR RIGHTS TO BRING AN ACTION IN COURT AND HAVE DISPUTES DECIDED BY A JUDGE OR JURY, AND OTHER PROVISIONS THAT LIMIT OUR LIABILITY TO YOU.
          </p>

          <p className="font-bold mb-6">
            ALL CLAIMS AND DISPUTES ARISING UNDER THESE TERMS MUST BE ARBITRATED OR LITIGATED ON AN INDIVIDUAL BASIS AND NOT ON A CLASS BASIS. CLAIMS OF MORE THAN ONE USER CANNOT BE ARBITRATED OR LITIGATED JOINTLY OR CONSOLIDATED WITH THOSE OF ANY OTHER USER.
          </p>

          <p className="mb-6">
            These Terms contain arbitration and class action waiver provisions that waive your right to a court hearing, right to a jury trial, and right to participate in a class action lawsuit. Arbitration is mandatory and is the exclusive remedy for any and all disputes, unless otherwise specified below in SECTION 11.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">1. SCOPE</h2>
          <p className="mb-4">
            This Agreement governs your access to and use of the Site, which includes all Content and Offerings. Unless otherwise specified in this Agreement, all access to and use of the Site and all Content and Offerings by you or on your behalf is subject to this Agreement. This Agreement is the complete and exclusive understanding and agreement between the parties, and supersedes any oral or written proposal, agreement or other communication between you and Fractional Ops, regarding your access to and use of the Site.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. YOU</h2>
          <p className="mb-4">
            If you have entered into this Agreement solely on your own behalf (to use the Site yourself, for your own benefit), then you are entering this Agreement as an individual. If you have entered into this Agreement on behalf of an organization or entity (so that the entity or organization can use the Site), then you are entering this Agreement on behalf of that entity or organization. In either case, you represent and warrant to Fractional Ops that you have the authority to enter into this Agreement, whether on your own behalf or on behalf of that entity or organization.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">3. MODIFICATIONS</h2>
          <p className="mb-4">
            Fractional Ops may, in its sole discretion, modify this Agreement from time to time. Fractional Ops will use commercially reasonable efforts to provide notice of any material modifications to this Agreement. Notice may be provided to you directly or to all Users through the Site. Unless we make a change for legal or administrative reasons, any modification to this Agreement will be effective 5 days following posting of the modified version of this Agreement to the Site.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">6. ELIGIBILITY</h2>
          <p className="mb-4">
            The Site, including all Content and Offerings, is for use by individuals 18 years of age and older. By entering into this Agreement and using the Site, you confirm that you are legally capable of entering into a binding agreement with Fractional Ops and you meet all such eligibility requirements.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">10. YOUR ACCOUNT</h2>
          <p className="mb-4">
            As a User of the Site, and in order to access certain Content and Offerings, you may be required to establish an account on the Site (your "Account"). Your Account and credentials are personal to you and may not be transferred or shared.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">16. OWNERSHIP</h2>
          <p className="mb-4">
            Fractional Ops retains all right, title and interest, including all intellectual property rights, in and to the Site, including all outputs generated by "Claire" (AI-CRO), and other technology used by or on behalf of Fractional Ops to operate the Site and Offerings.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">23. DISCLAIMER OF RESULTS</h2>
          <p className="font-bold mb-4">
            Fractional Ops does not promise, guarantee, represent, or warrant any level of success, income, sales, or specific results from use of the Site. YOUR BUSINESS'S RESULTS WILL VARY DEPENDING ON A VARIETY OF FACTORS UNIQUE TO YOUR BUSINESS.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">24. NO PROFESSIONAL ADVICE</h2>
          <p className="font-bold mb-4">
            NEITHER FRACTIONAL OPS NOR THE SITE PROVIDES INVESTMENT, OR OTHER PROFESSIONAL ADVICE. ALL CONTENT IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">25. NO ADDITIONAL WARRANTIES</h2>
          <p className="font-bold mb-4">
            THE SITE AND ALL CONTENT AND OFFERINGS ARE PROVIDED "AS IS" AND ON AN "AS AVAILABLE" BASIS. FRACTIONAL OPS MAKES NO WARRANTIES OF ANY KIND.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">27. LIMITATIONS OF LIABILITY</h2>
          <p className="font-bold mb-4">
            THE TOTAL AGGREGATE LIABILITY OF FRACTIONAL OPS TO YOU WILL NOT EXCEED ONE HUNDRED UNITED STATES DOLLARS ($100.00).
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">28. DISPUTE RESOLUTION</h2>
          <p className="mb-4">
            All disputes will be resolved through binding arbitration under JAMS in Toronto, Ontario, Canada.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">29. CHOICE OF LAW</h2>
          <p className="mb-4">
            This Agreement will be governed exclusively by the federal laws of Canada and the laws of the Province of Ontario.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">30. WAIVERS</h2>
          <p className="font-bold mb-4">
            YOU AGREE TO PURSUE ANY CLAIM AS AN INDIVIDUAL, AND WILL NOT JOIN A CLASS ACTION. THE PARTIES HEREBY WAIVE TRIAL BY JURY.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">37. CONTACT US</h2>
          <p className="mb-4">
            Email: support@fractionalops.com<br />
            Legal: legal@fractionalops.com
          </p>

          <hr className="my-8 border-t-2 border-gray-300" />

          <h1 className="text-xl font-bold mt-8 mb-4">Supplemental Terms for Claire (AI-CRO)</h1>
          <p className="text-sm text-gray-600 mb-4">Last updated: November 26, 2025</p>

          <p className="mb-4">
            These Supplemental Terms apply to your use of generative artificial intelligence features ("AI Features") including "Claire" the AI-CRO.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">4. INPUTS AND OUTPUTS</h2>
          <p className="mb-4">
            The AI Features allow you to submit content ("Inputs") and receive generated content ("Outputs"). You are responsible for all Inputs and must verify all Outputs before use.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">5. ACCURACY AND VERIFICATION</h2>
          <p className="mb-4">
            Due to the nature of AI, Outputs may be incomplete, contain errors, or fail to meet your expectations. You are solely responsible for reviewing and verifying all Outputs.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">8. THIRD-PARTY SERVICES</h2>
          <p className="mb-4">
            The AI Features are powered by third-party providers. Your Inputs will be transmitted to such providers for processing.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">13. USAGE LIMITATIONS</h2>
          <ul className="list-disc pl-6 mb-4">
            <li>Daily Prompt Soft Limit: 25 prompts per 24-hour period</li>
            <li>Daily Prompt Hard Limit: 50 prompts per 24-hour period</li>
            <li>Hourly Burst Limit: 30 prompts within any 60-minute window</li>
            <li>Monthly Prompt Limit: 500 prompts per 30-day period</li>
            <li>Chat Creation Limit: 7 new chats per 24-hour period</li>
          </ul>

          <p className="text-sm text-gray-600 mt-8 mb-4">
            Last updated: November 26, 2025<br />
            Effective Date: November 26, 2025
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}

