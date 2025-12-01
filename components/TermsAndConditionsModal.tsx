/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { recordTermsAcceptance } from '@/lib/supabase';

interface TermsModalProps {
  userId?: string;
  userEmail?: string;
  onAccept?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export default function TermsAndConditionsModal({ userId, userEmail, onAccept, onClose, readOnly = false }: TermsModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const TERMS_VERSION = '1.0'; // Update this when T&C changes

  const handleAccept = async () => {
    if (readOnly) return;
    
    setAccepting(true);
    try {
      await recordTermsAcceptance(TERMS_VERSION);
      if (onAccept) onAccept();
    } catch (error) {
      console.error('Failed to record T&C acceptance:', error);
      alert('Failed to save acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col relative">
        {/* Close Button for Read Only Mode */}
        {readOnly && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="p-6 border-b pr-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Terms and Conditions
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Please read and accept our terms to continue using Claire AI CRO
          </p>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
          <div className="text-gray-800">
            <h1 className="text-xl font-bold mb-4">Fractional Ops Site Terms and Conditions</h1>
            <p className="text-sm text-gray-600 mb-4">Last updated: November 26, 2025</p>
            
            <p className="font-bold mb-4">
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
              Fractional Ops may, in its sole discretion, modify this Agreement from time to time. Fractional Ops will use commercially reasonable efforts to provide notice of any material modifications to this Agreement. Notice may be provided to you directly or to all Users through the Site. Unless we make a change for legal or administrative reasons, any modification to this Agreement will be effective 5 days following posting of the modified version of this Agreement to the Site. Your continued access to the Site or use of the Content and Offerings following that date constitutes your acceptance of, and agreement to be bound by, any modified Agreement. Except for the foregoing, this Agreement may be amended or modified only by a writing signed by both parties.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">4. RIGHT TO MODIFY OR DISCONTINUE THE SITE</h2>
            <p className="mb-4">
              We reserve the right to modify or temporarily or permanently discontinue the Site, including any Content or Offerings, at any time with or without notice, by making those modifications available to you as part of the Site, Content, or Offerings. We will not be liable to you or to any third party for any modification, suspension or discontinuance of the Site, Content, or Offerings.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">5. DEFINITIONS</h2>
            <p className="mb-4">
              Terms used in this Agreement have the definitions given in this Agreement or, if not defined in this Agreement, have their plain English meaning as commonly interpreted in the United States.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">6. ELIGIBILITY</h2>
            <p className="mb-4">
              The Site, including all Content and Offerings, is for use by individuals 18 years of age and older. Additional eligibility requirements for various Content or Offerings may be stated on the Site. By entering into this Agreement and using the Site, you confirm that you are legally capable of entering into a binding agreement with Fractional Ops and you meet all such eligibility requirements. If you do not meet any such eligibility requirements, the Site is not for you, and you are not permitted to become a User of the Site and you may not access or use the Site or any Content or Offerings.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">7. TERM</h2>
            <p className="mb-4">
              This Agreement is effective as of the Effective Date and will continue until terminated as set forth herein.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">8. ADDITIONAL AGREEMENTS WITH FRACTIONAL OPS</h2>
            <p className="mb-4">
              In addition to this Agreement, if you enter into any other agreement with Fractional Ops or any of its affiliates (an "Additional Fractional Ops Agreement"), this Agreement does not affect the relationship you establish with Fractional Ops or such affiliate under the Additional Fractional Ops Agreement, and the Additional Fractional Ops Agreement will remain applicable between you and Fractional Ops or such affiliate, as applicable, provided that, unless explicitly stated otherwise in the Additional Fractional Ops Agreement, the terms of this Agreement will control in all respects with regard to the Site, including all Content and Offerings, and your access to and use thereof.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">9. THIRD PARTY OFFERINGS</h2>
            <p className="mb-4">
              The Site may also provide you with access to Offerings provided by third parties ("Third Party Offerings"). Fractional Ops does not operate, control, or endorse any Third Party Offerings. Third Party Offerings are offered for your convenience, and you assume sole responsibility for your use of any Third Party Offering. You may be required to agree to additional terms and conditions applicable to a Third Party Offering ("Third Party Terms"). Any Third-Party Terms shall control only as to your use of the Third Party Offering covered by those Third Party Terms, and the terms of this Agreement will continue to control in all other respects with respect to the Site and all Content and Offerings.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">10. YOUR ACCOUNT</h2>
            <p className="mb-4">
              As a User of the Site, and in order to access certain Content and Offerings, you may be required to establish an account on the Site (your "Account"). All Accounts are issued at the sole discretion of Fractional Ops.
            </p>
            <p className="mb-4">
              Your Account and the user name and password for your Account ("Account ID") are personal in nature. Your Account is for your own personal or business use and your Account ID may be used only by you alone. You may not transfer your Account to someone else. You also may not provide your Account ID to anyone else or give a third party access to your Account. You will ensure the security and confidentiality of your Account ID. If any Account ID is lost, stolen or otherwise compromised, you will notify Fractional Ops immediately as specified in the Contact Us section of this Agreement.
            </p>
            <p className="mb-4">
              You are solely responsible for your Account and all use of the Site and any Content or Offerings through your Account. You are fully responsible for all actions taken through your Account (or using your Account ID) and for any liabilities and damages incurred through the use of your Account (or your Account ID), whether lawful or unlawful.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">11. YOUR OBLIGATION TO PROVIDE TRUTHFUL INFORMATION</h2>
            <p className="mb-4">
              In connection with your use of the Site, and accessing certain Content and Offerings, you may be asked to submit information to the Site. If you submit information to Fractional Ops through the Site, you agree that: (1) the information you submit will be true, accurate, current and complete, and (2) you will promptly update your information to keep it accurate and current. You grant Fractional Ops all necessary rights, authorizations, consents, and permissions necessary to use such information in accordance with this Agreement.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">12. ACCESS TO THE SITE</h2>
            <p className="mb-4">
              Subject to your compliance with this Agreement, during the term of this Agreement, Fractional Ops will permit you to access the Site, including all applicable Content and Offerings, solely for your own use personal or business use in accordance with the terms of this Agreement. Your right to access the Site, Content, and Offerings is personal to you or the entity or organization that you represent and you may not distribute, sell, resell, lend, loan, lease, license, sublicense or transfer any of your rights to access or use the Site, Content, and Offerings, or otherwise make the Site, Content, and Offerings available to any third party.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">13. USER CONTENT</h2>
            <p className="mb-4">
              The Site may permit you to upload, provide, or make available your Content through the Site. You are solely responsible for all Content that you may upload, provide, or make available through the Site ("User Content"). You will obtain all rights, authorizations, consents, and permissions necessary to provide all User Content and to permit the processing and use thereof through the Site under this Agreement.
            </p>
            <p className="mb-4">
              You will ensure that all User Content you make available on the Site will not violate this Agreement, the Fractional Ops Privacy Policy or any other applicable Fractional Ops policy, or any applicable Laws. Fractional Ops may rely upon the accuracy and completeness of any of your User Content and is not responsible if any of your User Content is inaccurate and incomplete. You will notify Fractional Ops promptly of any unauthorized submission of or access to User Content through the Site.
            </p>
            <p className="mb-4">
              Fractional Ops is under no obligation to review any User Content for accuracy, completeness, copyright infringement, or potential liability and is not responsible or liable for any deletion, correction, destruction, damage, or loss of any User Content.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">14. SITE CONTENT</h2>
            <p className="mb-4">
              Any Content made available through the Site by Fractional Ops and its third-party suppliers ("Site Content") is for informational purposes only. Fractional Ops does not take any responsibility for any interruptions or delays in any Site Content or the unavailability of any Site Content. Fractional Ops is not responsible for any errors or omissions in any Site Content. You are solely responsible for verifying the accuracy and completeness of all Site Content, as well as the applicability and suitability of any Site Content to your intended use. Subject to your compliance with this Agreement, you may view the Site Content solely through the Site and only for your own personal or business use in connection with your permitted use of the Site.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">15. RESTRICTIONS</h2>
            <p className="mb-4">
              You may only use the Site, including all Offerings and any Site Content, for lawful purposes as expressly provided in this Agreement. As a condition of your use of the Site, you covenant and agree that you will not, and will not permit any third party to, use the Site, including all Offerings and any Site Content, for any purpose that is unlawful or prohibited by this Agreement.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">16. OWNERSHIP</h2>
            <p className="mb-4">
              Fractional Ops retains all right, title and interest, including all intellectual property rights, in and to the Site, including the Offerings and all Site Content, as well as all software, databases, hardware, all outputs generated by "Claire" (AI-CRO), and other technology used by or on behalf of Fractional Ops to operate the Site and Offerings ("Technology"), and any additions, improvements, updates and modifications thereto (collectively, "Fractional Ops Property").
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">17. FEEDBACK</h2>
            <p className="mb-4">
              Any comments, feedback, suggestions, testimonials, reviews, and other communications (including photos and videos) regarding the Site, Content, or Offerings ("Feedback") is entirely voluntary. We will be free to use any Feedback as we see fit for any purpose and without any notice, payment, or other obligation to you.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">18. FEES</h2>
            <p className="mb-4">
              General access to the Site is available without a fee. However, Third Party Offerings may require the payment of a fee or charge. In addition, Fractional Ops may charge fees for the use of certain Offerings or Content on the Site.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">19. TERMINATION</h2>
            <p className="mb-4">
              This Agreement may be terminated by either party at any time, in that party's sole discretion, upon notice to the other party as permitted under this Agreement.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">23. DISCLAIMER OF RESULTS</h2>
            <p className="font-bold mb-4">
              Fractional Ops does not promise, guarantee, represent, or warrant any level of success, income, sales, or specific results from use of the Site, including any Site Content or Offerings. YOUR BUSINESS'S RESULTS WILL VARY DEPENDING ON A VARIETY OF FACTORS UNIQUE TO YOUR BUSINESS.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">24. NO PROFESSIONAL ADVICE</h2>
            <p className="font-bold mb-4">
              NEITHER FRACTIONAL OPS NOR THE SITE PROVIDES INVESTMENT, OR OTHER PROFESSIONAL ADVICE AND ARE NOT INTENDED TO BE A SUBSTITUTE FOR INVESTMENT, OR OTHER PROFESSIONAL ADVICE OR RECOMMENDATIONS. ALL CONTENT MADE AVAILABLE TO YOU THROUGH THE SITE IS FOR EDUCATIONAL AND INFORMATIONAL PURPOSES OR GENERAL GUIDANCE ONLY.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">25. NO ADDITIONAL WARRANTIES</h2>
            <p className="font-bold mb-4">
              FRACTIONAL OPS MAKES NO REPRESENTATIONS OR WARRANTIES WHATSOEVER WITH RESPECT TO THE SITE, INCLUDING ANY CONTENT OR OFFERINGS. THE SITE AND ALL CONTENT AND OFFERINGS, ARE PROVIDED "AS IS" AND ON AN "AS AVAILABLE" BASIS.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">26. INDEMNITY</h2>
            <p className="mb-4">
              You agree to indemnify, defend, and hold harmless Fractional Ops and its officers, directors, shareholders, affiliates, employees, agents, contractors, assigns, users, customers, providers, licensees, and successors in interest from any and all claims, losses, liabilities, damages, fees, expenses and costs that result or arise from your use of the Site.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">27. LIMITATIONS OF LIABILITY</h2>
            <p className="font-bold mb-4">
              THE TOTAL AGGREGATE LIABILITY OF THE FRACTIONAL OPS PARTIES TO YOU OR ANY PERSON OR ENTITY CLAIMING THROUGH YOU WITH RESPECT TO THIS AGREEMENT AND THE SITES, CONTENT, AND OFFERINGS WILL NOT EXCEED ONE HUNDRED UNITED STATES DOLLARS ($100.00).
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">28. DISPUTE RESOLUTION</h2>
            <p className="mb-4">
              All disputes will be resolved through binding arbitration under JAMS in Toronto, Ontario, Canada.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">29. CHOICE OF LAW</h2>
            <p className="mb-4">
              This Agreement will be governed exclusively by the federal laws of Canada and the laws of the Province of Ontario.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">30. WAIVERS OF COLLECTIVE ACTION AND JURY TRIAL</h2>
            <p className="font-bold mb-4">
              YOU AGREE THAT YOU WILL PURSUE ANY CLAIM OR LAWSUIT AS AN INDIVIDUAL, AND WILL NOT JOIN A CLASS OR GROUP ACTION. THE PARTIES HEREBY WAIVE TRIAL BY JURY.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">31. STATUTE OF LIMITATIONS</h2>
            <p className="mb-4">
              Any claim must be filed within one (1) year after such claim arose.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">37. CONTACT US</h2>
            <p className="mb-4">
              Email: support@fractionalops.com<br />
              Legal: legal@fractionalops.com
            </p>

            <hr className="my-8 border-t-2 border-gray-300" />

            <h1 className="text-xl font-bold mt-8 mb-4">Supplemental Terms and Conditions for Claire (AI-CRO)</h1>
            <p className="text-sm text-gray-600 mb-4">Last updated: November 26, 2025</p>

            <p className="mb-4">
              These Supplemental Terms and Conditions for Claire (AI-CRO) ("AI Supplemental Terms") form a supplement to the Fractional Ops Site Terms and Conditions ("Terms") and are incorporated into and made a part of the Agreement formed by the Terms.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">4. INPUTS AND OUTPUTS</h2>
            <p className="mb-4">
              The AI Features allow you to submit text, data, documents, or other content and materials ("Inputs") to the AI Features and receive generated text, images, or other content and materials ("Outputs") through the AI Features.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">5. ACCURACY AND VERIFICATION</h2>
            <p className="mb-4">
              Due to the nature of artificial intelligence and machine learning technology the Outputs may be incomplete, contain inaccuracies or errors, be biased or offensive, or fail to meet your needs or expectations. You are solely responsible for reviewing and verifying all Outputs.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">8. THIRD-PARTY SERVICES DISCLOSURE</h2>
            <p className="mb-4">
              The AI Features are powered by models or services provided by third-party providers ("Third-Party AI Providers"). By accessing or using any AI Features, you acknowledge that Inputs will be transmitted to such providers.
            </p>

            <h2 className="text-lg font-bold mt-6 mb-3">13. USAGE LIMITATIONS</h2>
            <ul className="list-disc pl-6 mb-4">
              <li>Daily Prompt Soft Limit: 25 prompts per 24-hour period</li>
              <li>Daily Prompt Hard Limit: 50 prompts per 24-hour period</li>
              <li>Hourly Burst Limit: 30 prompts within any rolling 60-minute window</li>
              <li>Monthly Prompt Limit: 500 prompts per 30-day billing period</li>
              <li>Chat Creation Limit: 7 new chats per 24-hour period</li>
            </ul>

            <p className="text-sm text-gray-600 mt-8 mb-4">
              Last updated: November 26, 2025<br />
              Effective Date: November 26, 2025
            </p>
          </div>
        </div>

        {/* Footer only shown if not readOnly */}
        {!readOnly && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="terms-acceptance"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="terms-acceptance" className="text-sm text-gray-700 cursor-pointer select-none">
                  I have read and agree to the Terms and Conditions
                </label>
              </div>
              
              <button
                onClick={handleAccept}
                disabled={!acceptedTerms || accepting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
              >
                {accepting ? 'Processing...' : 'I Accept Terms & Conditions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
