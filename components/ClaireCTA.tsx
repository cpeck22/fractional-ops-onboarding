export default function ClaireCTA() {
  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-fo-primary/10 to-fo-secondary/10 border border-fo-primary/30 rounded-lg">
      <p className="text-center text-fo-dark">
        <span className="font-semibold">Not yet working with Claire?</span>
        {' '}
        <a 
          href="https://meetings.hubspot.com/corey-peck/claire-roi-roadmap-call"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-fo-orange text-white font-bold rounded-lg hover:bg-opacity-90 transition-all"
        >
          <span>Turn This On</span>
          <span>→</span>
        </a>
      </p>
    </div>
  );
}

